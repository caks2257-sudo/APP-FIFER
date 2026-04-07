# FIFER — technical deliverables (checklist)

This folder mirrors the **contract artifact names** requested for Cursor / audits. **Canonical implementations** remain in `saas-fifer/modules/fifer-platform/`, `supabase/migrations/`, and `docs/platform/`.

| Checklist item | Path |
|----------------|------|
| Analysis: inventory.json | `analysis/inventory.json` |
| Analysis: risk_matrix.csv | `analysis/risk_matrix.csv` |
| Analysis: rollback_plan.md | `analysis/rollback_plan.md` |
| Schema: tag_center_schema.sql | `schema/tag_center_schema.sql` (base + phase1 concatenated) |
| Schema: er_diagram_desc.md | `schema/er_diagram_desc.md` |
| Schema: seeds/tags_seed.json | `schema/seeds/tags_seed.json` |
| API: openapi.yaml | `api/openapi.yaml` |
| API: endpoints_examples.md | `api/endpoints_examples.md` |
| API: contract_tests.json | `api/contract_tests.json` |
| Scoring: scoring_dsl.json | `scoring/scoring_dsl.json` |
| Scoring: scoring_engine.js | `scoring/scoring_engine.js` (re-export) |
| Scoring: scoring_examples.json | `scoring/scoring_examples.json` (5 items) |
| Credits: engine_costs.csv | `credits/engine_costs.csv` |
| Credits: credit_simulator.js | `credits/credit_simulator.js` (re-export) |
| Credits: credit_examples.json | `credits/credit_examples.json` (3 items) |
| App scaffold: marketing_module_spec.md | `app_scaffold/marketing_module_spec.md` |
| App scaffold: api_contracts.json | `app_scaffold/api_contracts.json` |
| App scaffold: migrations/ | `app_scaffold/migrations/*.sql` |
| App scaffold: background_jobs.md | `app_scaffold/background_jobs.md` |
| Plays | `plays/sales_explosive.json`, `high_commission.json`, `viral_growth.json` |
| Governance: governance.md | `governance/governance.md` |
| CI: tests_contract.yml | `governance/ci/tests_contract.yml` and `ci/tests_contract.yml` (same) |
| Governance: monitoring_alerts.json | `governance/monitoring_alerts.json` |
| Governance: rollback_scripts.sql | `governance/rollback_scripts.sql` |
| Governance: deployment_checklist.md | `governance/deployment_checklist.md` |

**Repo CI:** `.github/workflows/contract-tests.yml` (root) — duplicate of `governance/ci/tests_contract.yml` for GitHub Actions.
