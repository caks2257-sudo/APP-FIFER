# Deployment checklist

## Pre-deploy

- [ ] `npm run test:contract` passes (or agreed skip with server down).
- [ ] Forward migrations reviewed; idempotent guards present.
- [ ] Rollback SQL exists for each new forward migration.
- [ ] `FEATURE_*` default off in production env template.
- [ ] Staging migration dry-run completed.
- [ ] `TAG_CENTER_INGEST_ACTOR_ID` UUID valid if ingest tag sidecar enabled.

## Deploy

- [ ] Deploy application code (flags off).
- [ ] Apply forward migrations to production (maintenance window if required).
- [ ] Smoke: `public.products` ingest unchanged with flags off.

## Post-deploy

- [ ] Enable canary tenant or internal process only.
- [ ] Monitor: credit ratio, tag update rate, 5xx on new routes.
- [ ] Ramp traffic per governance (5% → 100%).
- [ ] Document runbook link in incident channel.

## Rollback

- [ ] Flip feature flags off.
- [ ] If DB revert needed: run `deliverables/governance/rollback_scripts.sql` sections in **reverse** order of original apply (see `rollback_plan.md`).
