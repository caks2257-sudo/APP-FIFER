const { isEnabled } = require('../featureFlags');

/**
 * Declarative scoring: weighted sum of per-factor normalized scores in [0,1],
 * then scaled to [0,100]. Final score = clamp( round_half_up( sum_i (w_i/W * norm_i * 100), 3 ), 0, 100 ).
 *
 * @typedef {object} NormalizeRange
 * @property {number} min
 * @property {number} max
 * @property {boolean} [invert]
 */

/**
 * @typedef {object} ScoringProfile
 * @property {string} id
 * @property {string} [version]
 * @property {object} [tag_weight_map]
 * @property {object} [tie_break]
 * @property {ScoringFactor[]} factors
 */

function getPath(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function clamp01(x) {
    if (Number.isNaN(x)) return 0;
    return Math.min(1, Math.max(0, x));
}

function normalizeValue(raw, norm) {
    if (norm == null) return clamp01(Number(raw));
    const { min, max, invert } = norm;
    if (max === min) return 0;
    let v = (Number(raw) - min) / (max - min);
    if (invert) v = 1 - v;
    return clamp01(v);
}

function evalTagWeightCoverage(factor, input) {
    const map = factor.tag_weights || {};
    const have = new Set(input.tags || []);
    let matched = 0;
    let total = 0;
    for (const [k, w] of Object.entries(map)) {
        const wt = Number(w) || 0;
        total += wt;
        if (have.has(k)) matched += wt;
    }
    const norm = total > 0 ? matched / total : 0;
    return { raw: matched, norm, detail: { total_weight_in_map: total, matched_weight: matched } };
}

function evalFactor(factor, input) {
    if (factor.fn === 'tagWeightCoverage') {
        return evalTagWeightCoverage(factor, input);
    }
    if (factor.fn === 'tagOverlap') {
        const want = new Set(factor.tags || []);
        const have = new Set(input.tags || []);
        if (want.size === 0) return { raw: 0, norm: 0, detail: {} };
        let hit = 0;
        want.forEach((t) => {
            if (have.has(t)) hit += 1;
        });
        const raw = hit / want.size;
        return { raw, norm: raw, detail: { hits: hit, required: [...want] } };
    }
    if (factor.literal != null) {
        const norm = normalizeValue(factor.literal, factor.normalize);
        return { raw: factor.literal, norm, detail: {} };
    }
    const raw = getPath(input, factor.path);
    const norm = normalizeValue(raw, factor.normalize);
    return { raw, norm, detail: {} };
}

function roundHalfUp3(x) {
    return Math.round(x * 1000) / 1000;
}

/**
 * Single-product score with full explainability.
 * @param {ScoringProfile} profile
 * @param {Record<string, unknown> & { tags?: string[] }} input
 * @returns {{ score: number, explain: object }}
 */
function score(profile, input) {
    if (!isEnabled('SCORING_ENGINE')) {
        const err = new Error('SCORING_ENGINE disabled (set FEATURE_SCORING_ENGINE=true)');
        err.code = 'FEATURE_DISABLED';
        throw err;
    }
    const factors = profile.factors || [];
    const wSum = factors.reduce((s, f) => s + (Number(f.weight) || 0), 0);
    const explain = {
        profileId: profile.id,
        version: profile.version || null,
        objective: profile.objective || profile.id,
        normalization: {
            method: 'weighted_linear_0_100',
            formula: 'score = clamp( round_half_up( sum_i (weight_i / W) * norm_i * 100, 3 ), 0, 100 )',
            W: wSum,
        },
        factors: [],
        weightsSum: wSum,
        warnings: [],
    };
    if (wSum <= 0) {
        explain.warnings.push('weights_sum_zero');
        return { score: 0, explain };
    }

    let acc = 0;
    for (const f of factors) {
        const { raw, norm, detail } = evalFactor(f, input);
        const w = Number(f.weight) || 0;
        const share = w / wSum;
        const contrib = share * norm * 100;
        acc += contrib;
        explain.factors.push({
            id: f.id,
            weight: w,
            weightShare: share,
            raw,
            normalized: norm,
            contribution: contrib,
            detail: detail && Object.keys(detail).length ? detail : undefined,
        });
    }

    const rounded = roundHalfUp3(acc);
    const scoreVal = Math.min(100, Math.max(0, rounded));
    explain.sum_before_clamp = acc;
    explain.score_final = scoreVal;
    return { score: scoreVal, explain };
}

/**
 * Deterministic tie-break: higher score first; then higher primary factor contribution;
 * then product_id per tie_break.secondary (default asc).
 * @param {ScoringProfile} profile
 * @param {Array<Record<string, unknown> & { product_id: string, tags?: string[] }>} products
 */
function rankProducts(profile, products, options = {}) {
    const primaryFactorId =
        options.tieBreakFactorId ||
        profile.tie_break?.primary_factor_id ||
        profile.factors?.[0]?.id;
    const secondary = profile.tie_break?.secondary || options.secondary || 'product_id_asc';

    const rows = products.map((p) => {
        const { score: s, explain } = score(profile, p);
        const primaryContrib =
            explain.factors.find((f) => f.id === primaryFactorId)?.contribution ?? 0;
        return {
            product_id: p.product_id,
            score: s,
            explain,
            _primaryContrib: primaryContrib,
        };
    });

    rows.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b._primaryContrib !== a._primaryContrib) return b._primaryContrib - a._primaryContrib;
        const cmp = String(a.product_id).localeCompare(String(b.product_id));
        return secondary === 'product_id_desc' ? -cmp : cmp;
    });

    return rows.map((r, index) => {
        const { _primaryContrib, ...rest } = r;
        return {
            ...rest,
            rank: index + 1,
            tieBreak: {
                primary_factor_id: primaryFactorId,
                primary_contribution: _primaryContrib,
                secondary,
            },
        };
    });
}

module.exports = {
    score,
    rankProducts,
    getPath,
    normalizeValue,
    evalFactor,
    roundHalfUp3,
};
