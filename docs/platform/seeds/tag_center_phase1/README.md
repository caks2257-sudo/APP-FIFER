# TAG-CENTER Phase 1 — sample JSON rows

Five JSON objects per table for documentation and manual or scripted seeding. Fixed UUIDs are consistent across files (`tag_id` / `provider_id` references).

## Load order (respects foreign keys)

1. `tag_types.rows.json`
2. `tag_providers.rows.json` — note: base columns `slug`, `meta` must match `fifer_platform.tag_providers`; `display_name` / `kind` / `updated_at` come from Phase 1 migration.
3. `tags.rows.json` — requires `tag_types.slug` values for `type` and valid `provider_id` when set.
4. `tag_metrics.rows.json`, `tag_costs.rows.json`, `tag_history.rows.json`, `tag_associations.rows.json`
5. `provider_catalog.rows.json`

## Example concepts in `tags.rows.json`

| Concept | Tag name | `type` |
|---------|----------|--------|
| Price | `metric:price_midband` | `pricing` |
| Discount | `metric:discount_flash_30` | `promotion` |
| Video realism | `video_realism_level:standard` (`metrics[].key` = `video_realism_level`) | `video` |
| TTS quality | `tts_voice_quality:studio` (`metrics[].key` = `tts_voice_quality`) | `audio` |

SQL DDL and ER description: `supabase/migrations/20260407120000_tag_center_phase1_catalog.sql`, `docs/platform/TAG_CENTER_PHASE1_ER.md`.
