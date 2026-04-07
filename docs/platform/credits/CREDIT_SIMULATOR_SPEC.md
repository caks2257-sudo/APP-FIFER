# Credit consumption simulator — specification (Phase 4)

## Purpose

Estimate **credit** cost for pipelines that combine **LLM**, **video**, **TTS**, **image**, and **transcoding**, including:

- **Generation variations** (A/B, multi-output) — scale line quantities by `variation.outputs` and optional `variation.multiplier`.
- **Resolution / quality** — `resolutionPremium` scales quantities (e.g. 1.5× seconds for high-res video).
- **Parallel jobs** — does not divide GPU cost linearly; adds **coordination overhead** on the total:  
  `parallelMultiplier = 1 + (jobs - 1) * coordinationOverheadPerExtraJob`.
- **Failure retries** — **expected** extra cost on **fragile** lines (default: `video`, `tts`):  
  `expectedRetryMultiplier` derived from `attempts`, `successRate`, and `costFractionPerAttempt`.
- **Transcoding** — add `transcoding.overheadPct * video_generation_subtotal` (encode/mux ladder).

## Pseudocode

```
function simulateScenario(rates, lines, scenario):
  expanded = expand lines:
      qty' = qty * resolutionPremium
      if line not opted out of variation:
          qty' *= scenario.variation.outputs
      qty' *= scenario.variation.multiplier

  base = sum over lines of qty' * costPerUnit (per engine)

  split base breakdown into fragile (video, tts) vs non-fragile (text, image, …)
  afterRetry = non_fragile + fragile * expectedRetryMultiplier(retries)

  afterParallel = afterRetry * parallelMultiplier(parallel.jobs, overhead)

  transcode = video_generation_subtotal * transcoding.overheadPct
  total = afterParallel + transcode

  return { total, breakdown, layers, explain }
```

## Implementation

`saas-fifer/modules/fifer-platform/credits/creditSimulator.js` — `simulateScenario`, `estimate`, `DEFAULT_RATES`.

Feature flag: `FEATURE_CREDIT_SIMULATOR`.

## Calibration

See [CALIBRATION_TABLE.md](./CALIBRATION_TABLE.md) and [calibration_table.csv](./calibration_table.csv).
