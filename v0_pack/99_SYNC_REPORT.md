# v0_pack — Bitácora de sincronización externa

Diario ligero para Drive / NotebookLM: qué cambió en motores, boxes y gobernanza entre copias del pack.

## Última Sincronización: 2026-04-10

## Ciclo de Evolución — Auditor de fusión y puente a Core

- **Estado del autodescubrimiento:** operativo vía `discoverUserEngineReports` (`fifer-landing/src/core/user-engine-discovery.ts`); el auditor reescanea en cada `GET /api/dev/evolution-fusion` (solo **development**).
- **`fifer-landing/src/core/evolution-auditor.ts`** — lee todos los `engine_report.json` bajo `user_space/.../engines/<slug>/`; `detectFusionOpportunities()` agrupa por firma de **inputs**, **outputs** o similitud léxica (**name** / **function** / **id**).
- **`fifer-landing/src/schemas/fusion-proposal.schema.ts`** — esquema Zod del reporte de fusión: eficiencia lógica heurística (0–100), **riesgo acumulado**, **redundancia** y narrativa.
- **Mis Apps (`/mis-apps`)** — panel **Oportunidades de mejora** visible solo con `NODE_ENV === "development"` (`EvolutionAuditPanel.tsx`).
- **Puente de promoción** — botón **Preparar para Core** → `POST /api/dev/prepare-core-proposal` copia `user_space/[user_id_mock]/engines/<slug>/` a `src/registry/proposals/[targetSlug]/sources/<slug>/` y genera `FUSION_MASTER_PROMPT.md` (Master Prompt para Gemini/Cursor).
- **Data Weaver** — tipo de fuente **`experimental`** en `src/core/dataWeaver.ts`; helper `fifer-landing/src/core/data-weaver-experimental.ts` para slices comparables (ROI/exactitud) antes de promoción definitiva.

## Vault dinámico (AIVault) + DiscoveryBox BYOK

- **`fifer-landing/src/lib/vault-crypto.ts`** — AES-GCM + PBKDF2 (pepper `NEXT_PUBLIC_FIFER_VAULT_PEPPER`, fallback de desarrollo documentado). El plaintext de la API key **no** se persiste; solo JSON `{ v, iv, ct }` serializado.
- **`useUserStore`** — `vaultKeyCipherByEngineId`, `setCustomKey(engineId, key)` (cifrado async), `getVaultKeyPlain(engineId)`, `hasVaultKeyForEngine`. Incluido en `partialize` / `merge` del persist `FIFER_USER_DNA_KEY`.
- **`useUserEngine`** — Bloqueo cuando `risk === "high"` y no hay ciphertext para ese **`boxId`** (antes usaba `hasCustomKey` global). Expone `isLocked`, `lockReason: "vault-high-risk" | null` y pasa `{ boxId }` a `execute()`.
- **`UserEngineModule.execute`** — Firma `(ctx?: { boxId; provisionalApiKey? })` para Vault y “Probar conexión”.
- **`VaultConfigForm.tsx`** — UI BYOK (#0A0F1E / #EAB308): campo inferido del `engine_report` (`api_key` / ids con api|key|token…). **Guardar en Vault** → `setCustomKey(boxId, …)`; **Probar conexión** → `setRefiningTaskForBox` (Dual-Stage, `isRefining` en el Shell) + `execute({ boxId, provisionalApiKey })`.
- **`DiscoveryBox`** — Nuevo `reason: "vault-high-risk"`; renderiza `VaultConfigForm` como puente de configuración in-box.
- **`BoxLoader`** — Si vault-high-risk: `DiscoveryBox` + wrapper `data-fifer-lock-reason="vault-high-risk"`; atributos `data-fifer-vault-high-risk-lock` / `data-fifer-vault-lock-reason` en el section. **Skeleton de refinamiento** suprimido mientras el box está en lock BYOK para no ocultar el formulario durante la prueba de conexión.
- **Sandbox `sample-scraper`** — `engine_report.json` pasa a **`risk: "high"`** e input `providerApiKey` (`type: "api_key"`) para validar el flujo end-to-end (`npm run fifer:discover-engines` actualiza `user-engine-reports.generated.ts`).

## Autodescubrimiento y validación de User Engines

- **`fifer-landing/src/schemas/engine-report.schema.ts`** — esquema Zod estricto para `engine_report.json`: `id`, `name`, `function`, `risk` (`low` | `medium` | `high`), `inputs`, `outputs`, `version`; helpers `parseEngineReportJson` y `defaultEngineReportForSlug`.
- **`fifer-landing/src/core/user-engine-discovery.ts`** — escaneo de `src/user_space/[user_id_mock]/engines/<slug>/engine_report.json`, validación, mapa `boxId` → reporte (solo servidor / script; sin `fs` en el cliente).
- **`listActiveUserEngineSlugs`** — en `user-engine-reports.ts`, derivado del mapa generado, para deduplicación en el orquestador sin importar el escáner con `fs`.
- **`fifer-landing/scripts/discover-user-engines.ts`** + **`user-engine-reports.generated.ts`** — generación del mapa `USER_ENGINE_REPORTS` en build (`npm run fifer:discover-engines`, enganchado en `prebuild`).
- **`fifer-landing/src/user_space/user-engine-reports.ts`** — reexporta el mapa generado (sin imports manuales por motor).
- **API dev** — `GET /api/dev/user-engine-discovery` (JSON del escaneo); `POST /api/dev/scaffold-user-engine` escribe `.scaffold.tmp` y **`engine_report.json`** válido (cuerpo opcional `engineReport`).
- **`ai-orchestrator.ts`** — borrador de reporte alineado al esquema; usa **`listActiveUserEngineSlugs()`** (`user-engine-reports.ts`) para no proponer motores duplicados si el slug ya está en el mapa descubierto.
- **Mis Apps** — badge de **Estado de auditoría** por `risk` (Seguro / Revisión IA / Requiere API Key · Vault); lista alimentada por `USER_ENGINE_REPORTS`.
- **`useUserEngine`** — bloqueo Vault cuando `risk === "high"` sin clave cifrada para ese `boxId` en AIVault (ver sección **Vault dinámico** arriba).

## Mis Apps + AI Orchestrator (scaffolding)

- **Ruta** `fifer-landing/src/app/(dashboard)/mis-apps/page.tsx` — grid **12 columnas** (span-8 lista de apps con estados `idle` / `locked`, span-4 **chat del orquestador**). El layout del dashboard usa `DashboardShellBody` para dar **ancho completo** en `/mis-apps` (sin rail de stats a la derecha; el orquestador ocupa la columna lateral de la propia página).
- **`fifer-landing/src/core/ai-orchestrator.ts`** — análisis simulado del prompt frente a **`FIFER_BOX_CATALOG`**: detecta si hace falta un motor nuevo (p. ej. scraping + sitio/marca propia) y devuelve **`EngineProposal`** (árbol de carpetas bajo `src/user_space/[user_id_mock]/`, borrador de `engine_report.json`, inputs/outputs). Incluye `formatScaffoldPreviewText` para logs y `.tmp`.
- **UI Dual-Stage** — el panel de chat muestra **`isRefining`** con skeleton + `RefiningPromptPulse` (“Pulido de Prompt”, `03_PROTOCOL_SHELL.md` §2.1) mientras “piensa” antes de mostrar el resultado.
- **Scaffolding mock** — botón **Generar Engine**: `POST /api/dev/scaffold-user-engine` escribe **`.scaffold.tmp`** y **`engine_report.json`** (validado con Zod); hay **Descargar .tmp** como respaldo offline. Tras generar, **`npm run fifer:discover-engines`** (o `prebuild`) actualiza el mapa consumido por el Shell.
- **Sidebar** — enlace **Mis Apps** encima de “Estado del sistema”.

## Ejecución y resiliencia (User Engines)

- **Hook `useUserEngine`** (`fifer-landing/src/hooks/useUserEngine.ts`): ejecuta `execute()` del motor en `user_space` con **Etapa 1 Dual-Stage** (`isRefining` + ~420 ms de “Pulido de Prompt” antes del payload final), alineado a `03_PROTOCOL_SHELL.md` §2.1.
- **`engine_report.json`**: validado con Zod (`engine-report.schema.ts`), mapa autogenerado en `user-engine-reports.generated.ts`; **riesgo `high` sin entrada en `vaultKeyCipherByEngineId[boxId]`** → Modo Discovery **`vault-high-risk`** + `VaultConfigForm` (no solo overlay genérico).
- **Circuit breaker** (`src/core/CircuitBreaker.ts`): integrado en `BoxLoader` **solo para `boxId` con prefijo `u-`**; tras 3 fallos consecutivos → `DiscoveryBox` con `reason="circuit-open"`; botón **Sanar** llama `boxCircuitBreaker.reset(boxId)` (vía `onHeal`).
- **Sandbox `sample-scraper`**: en `development`, fallo aleatorio ~1/3 en `execute()` para validar `BoxErrorBoundary` y rompecircuitos sin afectar al grid vecino.

## User space (sandbox autoevolutivo)

- **Ruta base:** `fifer-landing/src/user_space/` con carpeta de ejemplo **`[user_id_mock]/`** (`apps/`, `engines/`).
- **Motor mock:** `engines/sample-scraper/` — `execute()` → `FiferBoxDataNormalized`, `engine_report.json` (riesgo **`high`** + BYOK de demo).
- **BoxId:** prefijo de seguridad **`u-`** en manifiestos (kebab-case compatible con Zod; equivalente al prefijo documental `u_` del Masterplan). Ejemplo: `u-user-id-mock-sample-scraper`.
- **Registro:** fusionado en `fifer-landing/src/registry/box-catalog.ts` + cargadores JIT en `fifer-landing/src/components/v0-ingestion/registry.ts` vía `user-space-manifests.ts`.
- **EventBus:** `src/core/EventBus.ts` acepta `options.namespace` (p. ej. `user_id`) para canales `ns:<id>:<channel>`.
- **Estado:** sandbox **creado y cableado** en catálogo + registry; listo para ampliar motores por usuario bajo `user_space/<userId>/`.

## Cambios en Engines:

- `src/utils/v0-mirror.ts`: al generar `v0_pack/01–13`, se normalizan enlaces Markdown con `../` respecto a la raíz del repo para que el pack sea navegable al copiarlo solo a Drive/NotebookLM.
- `packages/engines/finance-engine/src/gateways/FinanceGatewayMock.js`: creado gateway mock con refinamiento asíncrono (1.5s), `createSubscription/handleWebhook/getPaymentStatus` y actualización de `subscription_tier=pro` en Supabase.
- `src/services/ai/ai_task_router.js`: añadido bypass de pagos para `stripe/flow` con detección de estado en `11_INTEGRATIONS_STATUS.md`, apertura de CircuitBreaker y redirección a `FinanceGatewayMock`.

## Nuevos BoxIds:

- `u-user-id-mock-sample-scraper` (user_space / sample-scraper, sandbox)

## Estado de Gobernanza: Modificado

- Añadido **§0.12** en `.cursorrules` (obligación de replicar cambios en [`DNA_RULES_SNAPSHOT.md`](DNA_RULES_SNAPSHOT.md)).
- Paso **6** añadido al protocolo de cierre en `FIFER_XRAY_REPORT.md` / espejo [`01_REPORT_MAESTRO.md`](01_REPORT_MAESTRO.md) (`99_SYNC_REPORT` + snapshot de ADN).
- Normativa canónica en `.cursorrules`; espejo legible en [`DNA_RULES_SNAPSHOT.md`](DNA_RULES_SNAPSHOT.md).
- Registrado bypass de pagos en modo desarrollo: Smart Task Router deriva a Finance Mock Gateway cuando Stripe/Flow esté en estado crítico (🔴/🟡) o por `USE_FINANCE_MOCK=true`.
