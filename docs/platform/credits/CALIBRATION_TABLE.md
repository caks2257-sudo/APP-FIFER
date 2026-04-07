# AI engine & provider calibration (credits)

Illustrative **cost_per_unit** values for simulation. Tune per environment from vendor invoices and observed usage.

| engine_id | provider | category | unit | cost_per_unit_credits | notes |
|-----------|----------|----------|------|----------------------:|--------|
| gemini_flash_text | Google | text | 1k_tokens | 0.12 | Primary scripts / JSON |
| gemini_pro_text | Google | text | 1k_tokens | 0.45 | Heavier reasoning |
| runway_video | Runway | video | 1s_render | 2.5 | Standard motion clip |
| runway_video_4k | Runway | video | 1s_render | 4.2 | High-res / longer GPU |
| leonardo_image | Leonardo | image | 1_image | 1.0 | Still / keyframe |
| elevenlabs_tts | ElevenLabs | tts | 1k_chars | 0.8 | Voiceover |
| ffmpeg_transcode | Internal | transcode | 1s_output | 0.05 | Encode ladder (optional line item) |

**Overhead (applied in simulator, not in table):**

- **Transcoding:** `%` on video **generation** subtotal (H.264/H.265 ladder, mux).
- **Parallel jobs:** `+coordinationOverheadPerExtraJob × (jobs − 1)` on credit total.
- **Retries:** expected multiplier on **fragile** lines (`video`, `tts` by default).

CSV mirror: [calibration_table.csv](./calibration_table.csv).
