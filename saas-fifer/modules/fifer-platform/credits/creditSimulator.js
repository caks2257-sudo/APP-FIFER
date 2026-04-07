const { isEnabled } = require('../featureFlags');

/**
 * @typedef {object} RateRow
 * @property {string} unit
 * @property {number} costPerUnit credits per unit
 * @property {string} [category] text | video | tts | image | transcode
 */

/**
 * @typedef {object} UsageLine
 * @property {string} engineId
 * @property {string} unit
 * @property {number} qty
 * @property {string} [lineId]
 * @property {boolean} [subjectToVariation] multiply qty by scenario.variation.outputs
 * @property {boolean} [subjectToRetries] apply retry expected multiplier (default by category)
 */

/**
 * @typedef {object} SimulateOptions
 * @property {number} [variation.outputs] number of distinct generations (default 1)
 * @property {number} [variation.multiplier] extra multiplier on variant lines (default 1)
 * @property {{ jobs: number, coordinationOverheadPerExtraJob: number }} [parallel]
 * @property {{ attempts: number, successRate: number, costFractionPerAttempt: number }} [retries]
 * @property {number} [transcoding.overheadPct] e.g. 0.08 = +8% on video subtotal
 * @property {string[]} [transcoding.applyToEngineIds] substring match or exact; default video engines
 * @property {number} [resolutionPremium] multiply video qty for high-res (e.g. 1.5)
 */

/**
 * Default calibration (credits); override via calibration CSV / env in production.
 */
const DEFAULT_RATES = {
    gemini_flash_text: { unit: '1k_tokens', costPerUnit: 0.12, category: 'text' },
    gemini_pro_text: { unit: '1k_tokens', costPerUnit: 0.45, category: 'text' },
    runway_video: { unit: '1s_render', costPerUnit: 2.5, category: 'video' },
    runway_video_4k: { unit: '1s_render', costPerUnit: 4.2, category: 'video' },
    leonardo_image: { unit: '1_image', costPerUnit: 1.0, category: 'image' },
    elevenlabs_tts: { unit: '1k_chars', costPerUnit: 0.8, category: 'tts' },
    ffmpeg_transcode: { unit: '1s_output', costPerUnit: 0.05, category: 'transcode' },
};

function expectedRetryMultiplier({ attempts, successRate, costFractionPerAttempt }) {
    const pFail = Math.min(1, Math.max(0, 1 - successRate));
    const frac = costFractionPerAttempt == null ? 1 : costFractionPerAttempt;
    // Expected extra cost from up to `attempts` retries (geometric-style bound)
    let extra = 0;
    let failProb = pFail;
    for (let k = 1; k <= attempts; k += 1) {
        extra += failProb * frac;
        failProb *= pFail;
    }
    return 1 + extra;
}

function parallelMultiplier({ jobs, coordinationOverheadPerExtraJob }) {
    const j = Math.max(1, Math.floor(jobs || 1));
    const o = coordinationOverheadPerExtraJob == null ? 0.05 : coordinationOverheadPerExtraJob;
    return 1 + (j - 1) * o;
}

/**
 * Line-item estimate (no feature flag).
 * @param {Record<string, RateRow>} ratesByEngine
 * @param {UsageLine[]} lines
 */
function estimateLines(ratesByEngine, lines) {
    const breakdown = [];
    let total = 0;
    for (const line of lines) {
        const r = ratesByEngine[line.engineId];
        if (!r) {
            breakdown.push({
                engineId: line.engineId,
                unit: line.unit,
                qty: line.qty,
                costPerUnit: null,
                subtotal: null,
                error: 'unknown_engine',
            });
            continue;
        }
        if (r.unit !== line.unit) {
            breakdown.push({
                engineId: line.engineId,
                unit: line.unit,
                qty: line.qty,
                costPerUnit: r.costPerUnit,
                subtotal: null,
                error: 'unit_mismatch',
            });
            continue;
        }
        const subtotal = line.qty * r.costPerUnit;
        total += subtotal;
        breakdown.push({
            engineId: line.engineId,
            unit: line.unit,
            qty: line.qty,
            costPerUnit: r.costPerUnit,
            subtotal,
            error: null,
        });
    }
    return { total, breakdown };
}

/**
 * Legacy flat estimate (feature-flagged).
 */
function estimate(ratesByEngine, lines) {
    if (!isEnabled('CREDIT_SIMULATOR')) {
        const err = new Error('CREDIT_SIMULATOR disabled (set FEATURE_CREDIT_SIMULATOR=true)');
        err.code = 'FEATURE_DISABLED';
        throw err;
    }
    const { total, breakdown } = estimateLines(ratesByEngine, lines);
    return { total, breakdown, currency: 'credits' };
}

/**
 * Full simulation: base units → variations → retries (fragile categories) → parallel coordination → transcoding on video.
 * @param {Record<string, RateRow>} ratesByEngine
 * @param {UsageLine[]} lines
 * @param {SimulateOptions} [scenario]
 */
function simulateScenario(ratesByEngine, lines, scenario = {}) {
    if (!isEnabled('CREDIT_SIMULATOR')) {
        const err = new Error('CREDIT_SIMULATOR disabled (set FEATURE_CREDIT_SIMULATOR=true)');
        err.code = 'FEATURE_DISABLED';
        throw err;
    }

    const outputs = Math.max(1, scenario.variation?.outputs ?? 1);
    const varMul = scenario.variation?.multiplier ?? 1;
    const resPrem = scenario.resolutionPremium ?? 1;

    const expanded = lines.map((line) => {
        const r = ratesByEngine[line.engineId];
        const isVideo = r?.category === 'video' || line.kind === 'video';
        let qty = line.qty;
        if (isVideo && line.applyResolutionPremium !== false) {
            qty *= resPrem;
        }
        if (line.subjectToVariation !== false && outputs > 1) {
            qty *= outputs;
        }
        qty *= varMul;
        return { ...line, qty };
    });

    const base = estimateLines(ratesByEngine, expanded);

    const layers = {
        base_subtotal: round3(base.total),
        variation: { outputs, multiplier: varMul, resolutionPremium: resPrem },
    };

    const retryCfg = scenario.retries || { attempts: 0, successRate: 0.9, costFractionPerAttempt: 1 };
    const rMult = expectedRetryMultiplier({
        attempts: retryCfg.attempts ?? 0,
        successRate: retryCfg.successRate ?? 0.9,
        costFractionPerAttempt: retryCfg.costFractionPerAttempt ?? 1,
    });

    let fragileSubtotal = 0;
    let nonFragileSubtotal = 0;
    let videoGenSubtotal = 0;
    for (let i = 0; i < base.breakdown.length; i += 1) {
        const row = base.breakdown[i];
        const orig = expanded[i];
        const r = ratesByEngine[orig.engineId];
        const cat = r?.category || '';
        const fragile =
            orig.subjectToRetries !== false &&
            (orig.subjectToRetries === true || cat === 'video' || cat === 'tts');
        const sub = row.subtotal == null ? 0 : row.subtotal;
        if (fragile) fragileSubtotal += sub;
        else nonFragileSubtotal += sub;
        if (cat === 'video' || (r && orig.engineId.includes('runway'))) videoGenSubtotal += sub;
    }

    const afterRetry = nonFragileSubtotal + fragileSubtotal * rMult;
    layers.retries = {
        multiplier: round3(rMult),
        attempts: retryCfg.attempts ?? 0,
        successRate: retryCfg.successRate,
        fragile_subtotal: round3(fragileSubtotal),
        non_fragile_subtotal: round3(nonFragileSubtotal),
        subtotal_after_retry: round3(afterRetry),
    };

    const par = scenario.parallel || { jobs: 1, coordinationOverheadPerExtraJob: 0.05 };
    const pMult = parallelMultiplier({
        jobs: par.jobs ?? 1,
        coordinationOverheadPerExtraJob: par.coordinationOverheadPerExtraJob,
    });
    const afterParallel = afterRetry * pMult;
    layers.parallel = {
        jobs: Math.max(1, Math.floor(par.jobs ?? 1)),
        multiplier: round3(pMult),
        subtotal_after_parallel: round3(afterParallel),
        note: 'Parallelism reduces wall time; coordination/queue overhead scales with extra jobs',
    };

    const tc = scenario.transcoding || { overheadPct: 0 };
    const pct = tc.overheadPct ?? 0;
    const transcodeCost = videoGenSubtotal * pct;
    const total = round3(Math.max(0, afterParallel + transcodeCost));
    layers.transcoding = {
        overheadPct: pct,
        video_generation_subtotal: round3(videoGenSubtotal),
        transcode_credits_added: round3(transcodeCost),
    };

    return {
        total,
        currency: 'credits',
        breakdown: base.breakdown,
        expanded_lines: expanded,
        layers,
        explain: {
            pipeline: [
                'expand quantities (resolution, variation outputs, variation multiplier)',
                'compute base credits per line',
                'apply expected retry multiplier to fragile line subtotals (video/tts)',
                'apply parallel coordination multiplier to running total',
                'add transcoding overhead as fraction of video generation subtotal',
            ],
        },
    };
}

function round3(x) {
    return Math.round(x * 1000) / 1000;
}

module.exports = {
    estimate,
    estimateLines,
    simulateScenario,
    expectedRetryMultiplier,
    parallelMultiplier,
    DEFAULT_RATES,
};
