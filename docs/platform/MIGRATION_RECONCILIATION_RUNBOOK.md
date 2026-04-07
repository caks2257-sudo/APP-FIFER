# Migration Reconciliation Runbook

Este runbook alinea el historial remoto de Supabase con el nuevo timeline canonico de `supabase/migrations`.

## Contexto

Se renombraron timestamps de migraciones para ordenar ejecucion por dominio:

1. Auth / Tag-Center
2. Campaign Drafts
3. Ad Mappings y extensiones
4. Finanzas

Cuando un entorno remoto ya tenia aplicadas las migraciones con timestamps legacy, el historial queda desalineado y hay que reconciliarlo con `migration repair`.

## Pre-checks

- Tener acceso al proyecto Supabase remoto.
- Tener token de acceso en el entorno (`SUPABASE_ACCESS_TOKEN`) o login activo.
- Crear respaldo SQL antes de reparar historial.

## Mapeo legacy -> canonico

- `20260406120000` -> `20260406090000` (`tag_center_schema`)
- `20260407120000` -> `20260406100000` (`tag_center_phase1_catalog`)
- `20260408100000` -> `20260406110000` (`app_marketing_scaffold`)
- `20260412150000` -> `20260406115000` (`user_api_keys_vault`)
- `20260410120000` -> `20260406130000` (`campaign_drafts`)
- `20260407190000` -> `20260406140000` (`campaign_drafts_add_paused_status`)
- `20260407213000` -> `20260406150000` (`ad_mapping`)
- `20260407224500` -> `20260406160000` (`ad_mapping_system`)
- `20260409120000` -> `20260406170000` (`master_pipeline_publish_log`)
- `20260411120000` -> `20260406180000` (`financial_bunker_wallets`)
- `20260412120000` -> `20260406190000` (`exchange_rates`)

## Ejecucion recomendada

1. Simulacion (dry-run):
   - `powershell -ExecutionPolicy Bypass -File scripts/reconcile_supabase_migrations.ps1`
2. Ejecucion real:
   - `powershell -ExecutionPolicy Bypass -File scripts/reconcile_supabase_migrations.ps1 -Execute -ProjectRef <TU_PROJECT_REF>`
3. Aplicar pendientes reales (por ejemplo ledger nuevo):
   - `npx supabase db push`
4. Verificar estado:
   - `npx supabase migration list`

## Resultado esperado

- Timestamps legacy marcados como `reverted` en historial remoto.
- Timestamps canonicos marcados como `applied`.
- Migraciones realmente nuevas (ej. `20260406200000_finance_ledger_core.sql`) quedan listas para ejecutarse con `db push`.
