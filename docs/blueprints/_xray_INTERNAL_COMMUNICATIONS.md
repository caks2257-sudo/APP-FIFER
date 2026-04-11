# Espejo X-Ray — canales HTTP y dependencias (`/api/v1`)

Fuente: `src/app/api/v1/**/route.ts`, `src/lib/api-manager.ts`, `src/engines/system-health/index.ts`, `src/utils/fifer-box-data-bridge.ts`.

**InternalApiKey:** modelo Prisma `InternalApiKey` (`prisma/schema.prisma`); emisión y listado en `src/actions/api-key-actions.ts` vía `generateInternalKey` (`src/lib/api-manager.ts`). `validateInternalRequest` está definida en `src/lib/api-manager.ts`; `src/scripts/test-handshake.ts` la importa y la ejecuta. **Ningún** archivo bajo `src/app/api` importa ni llama a `validateInternalRequest`.

---

## Rutas Next.js App Router (origen → efecto)

| Ruta | Método | Parámetros / cuerpo | Conexiones reales |
|------|--------|---------------------|-------------------|
| `/api/v1/dashboard` | `GET` | — | Import estático `FIFER_CORE/xray_engines/xray_admitad.js` (`fetchAffiliateData`); payload de widgets con datos embebidos y `STRESS_CONTRATOS_API_SABOTAGE` (`@/utils/fifer-box-data-bridge`). |
| `/api/v1/inmobiliario` | `GET` | — | JSON fijo en memoria (`schemaVersion: 1.0-inmobiliario`, `propiedades[]`). |
| `/api/v1/contratos` | `GET` | Query `fail=1` → 500 simulado | Mismo cuerpo JSON que Chicureo (lista `contratos`). |
| `/api/v1/contracts/chicureo` | `GET` | Query `fail=1` → 500 simulado | Lista `contratos` fija (Chicureo). |
| `/api/v1/misbots` | `GET` | — | `BotDataPayload` en memoria (`@/types/schemas`); no lee tabla `Bot`. |
| `/api/v1/misbots/generate-avatar` | `POST` | JSON: `botId`, `prompt`, `core` (`CoreProfile`) | `EngineRegistry.use('ai-fallback:image-gen')` → sub-engine image-gen. |
| `/api/v1/misbots/test-comms` | `POST` | JSON: `botId`, `botNombre?`, `provider?` (`whatsapp`\|`email`), `core` | `EngineRegistry.use('ai-fallback:comms')`; destino admin: `FIFER_ADMIN_EMAIL`, `FIFER_ADMIN_WHATSAPP_E164` / `FIFER_ADMIN_WHATSAPP` o mocks si faltan. |
| `/api/v1/fractal-insight/dual-stage` | `POST` | JSON: `moduleId`, `boxId`, `contextData`, `systemInstruction`, `dna` (`AppPreferences`), `core` (`CoreProfile`) | `EngineRegistry.use('ai-fallback')` → `processInsight`. Errores cascada → 503 `AiCascadeExhaustedError`. |
| `/api/v1/system-health` | `GET` | Query `scope`: `external` \| `internal` \| `engines` \| (omitido = `full`) | `EngineRegistry.use('system-health')` → `getGlobalStatus({ origin })`; `origin` desde headers. Incluye sondas externas (OpenAI, Google) y **HTTP interno** a `GET ${origin}/api/v1/misbots` y `GET ${origin}/api/v1/contratos`. |
| `/api/v1/test-connection` | `GET` | — | Cliente `supabase` (anon): `from('User').select('*').limit(1)`. |

---

## Constantes de consumo (cliente / bridge)

`src/utils/fifer-box-data-bridge.ts` — `FIFER_BOX_DATA_ROUTES`:

- `contractsChicureoLocales`, `fiferContratosMain` → `/api/v1/contracts/chicureo`
- `fiferInmobiliarioMain` → `/api/v1/inmobiliario`
- `fiferMisbotsMain` → `/api/v1/misbots`
- `fiferDevExternal` → `/api/v1/system-health?scope=external`
- `fiferDevInternal` → `/api/v1/system-health?scope=internal`
- `fiferDevEngines` → `/api/v1/system-health?scope=engines`

Otros:

- `src/hooks/useDashboard.ts` → `fetch('/api/v1/dashboard', { method: 'GET' })`
- `src/lib/ai/runDualStageChatPipeline.ts` → `DEFAULT_DUAL_STAGE_PATH = '/api/v1/fractal-insight/dual-stage'`
- `src/components/v0-ingestion/boxes/FiferMisbotsMain.tsx` → `POST /api/v1/misbots/generate-avatar`, `POST /api/v1/misbots/test-comms`

---

## Motores referenciados por ID (`EngineRegistry`)

Rutas que resuelven motor por string: `system-health`, `ai-fallback`, `ai-fallback:image-gen`, `ai-fallback:comms` (código en archivos citados arriba).
