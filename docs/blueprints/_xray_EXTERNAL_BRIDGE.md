# X-Ray — External Bridge Engine (integraciones externas)

Espejo técnico verificable: rutas, paquete y variables. Actualizar junto con cambios en código.

## UBICACIÓN LÓGICA (motor)

`FIFER://engines/external-bridge-engine`

**Paquete:** `packages/engines/external-bridge-engine/src/` — `BridgeProxy`, adaptadores (`PaymentsAdapter`, `BillingAdapter`, `BankingAdapter`), mocks.

**Registro:** `src/engines/external-bridge-engine/index.ts` → `EngineRegistry` id `external-bridge-engine`.

**Montaje:** import en `src/engines/system-health/index.ts` (sonda `ENGINE_PROBE_IDS`).

## Macro-Pilares (Ley de soberanía — `.cursorrules` §14) y orden físico `.env` (§15)

Toda integración listada en `BRIDGE_ENV_BINDINGS` incluye `category: BridgeConnectionCategory`. La taxonomía canónica son **cinco** Macro-Pilares (constante `BRIDGE_MACRO_PILLARS` en `packages/engines/external-bridge-engine/src/keys.ts`):

| `BridgeConnectionCategory` | Rol |
|-----------------------------|-----|
| `INTELIGENCIA_ARTIFICIAL` | Modelos y APIs cognitivas (OpenAI, Anthropic, Gemini, Groq, ElevenLabs, Runway, etc.) |
| `FINANZAS_PAGOS` | Pagos, facturación, banca (Flow, Stripe, Fintoc en `BRIDGE_ENV_BINDINGS`; prefijos equivalentes en descubrimiento) |
| `ECOMMERCE` | Tiendas, marketplaces y afiliación (`AMAZON_`, `EBAY_`, `ALI_`, `ML_`, `SHOPIFY_`, `WOO_`/`WOOCOMMERCE_`, `CLICKBANK_*`, etc.; icono discovery `ShoppingCart`) |
| `INFRAESTRUCTURA` | Plataforma, BaaS, CI/CD (`SUPABASE_*` multi-llave agrupada, `VERCEL_`, `GITHUB_*` / `GH_TOKEN`) |
| `REDES_SOCIALES` | OAuth y redes (`FB_`, `META_`, `FACEBOOK_*`, `INSTAGRAM_*`, `LINKEDIN_*`) |

**Multi-Key:** Supabase y similares comparten `groupId` / `groupLabel` (p. ej. `supabase`) para que el hub muestre un solo Box lógico con varias variables.

### Mapa de prefijos → Macro-Pilar (auto-descubrimiento)

Implementación: `describeDiscoveredKey` en `packages/engines/external-bridge-engine/src/discovery.ts`. Reglas orientativas (no exhaustivas; el código es la fuente de verdad):

| Prefijos / patrones | Macro-Pilar |
|--------------------|-------------|
| `OPENAI_`, `ANTHROPIC_`, `GEMINI` / `GOOGLE_AI`, `GROQ`, `ELEVEN` / `ELEVENLABS`, `RUNWAY`, `GOOGLE_API_KEY` (IA generativa) | `INTELIGENCIA_ARTIFICIAL` |
| `FLOW_*`, `STRIPE_*`, `FINTOC_*` (bindings Bridge + descubrimiento futuro) | `FINANZAS_PAGOS` |
| `AMAZON_`, `EBAY_`, `ALI_`, `ML_`, `SHOPIFY_`, `WOO_`, `WOOCOMMERCE_`, `CLICKBANK_`, `BIGCOMMERCE_`, `ECOMMERCE_`, `PRESTASHOP_*`, `SHOPIFY` en nombre, Amazon Seller/MWS | `ECOMMERCE` |
| `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*`, `VERCEL_`, `GITHUB_*`, `GH_TOKEN`, `GITHUB_TOKEN` | `INFRAESTRUCTURA` |
| `FB_`, `META_`, `FACEBOOK_*`, `INSTAGRAM_*`, `LINKEDIN_*` | `REDES_SOCIALES` |

Variables sin regla reconocida no generan fila de auto-descubrimiento hasta añadir prefijo en `describeDiscoveredKey`.

**Orden físico del `.env`:** bloques `# === [nombre legible] ===` por Macro-Pilar (véase `.cursorrules` §15): `INTELIGENCIA ARTIFICIAL`, `FINANZAS & PAGOS`, `E-COMMERCE`, `INFRAESTRUCTURA`, `REDES SOCIALES`. Sin llaves de integración fuera de bloque cuando se edita en contexto autorizado.

**Mock-First:** toda conexión nueva debe arrancar en MOCK hasta clave real o credencial cifrada válida (`INSERT_KEY_HERE` / vacío → MOCK, §12).

**Escritura `.env` físico:** solo Sub-Engine `system-engine:env-manager` y solo con `NODE_ENV=development` (`readEnvFile` / `writeEnvFile`).

**Auto-descubrimiento:** `packages/engines/external-bridge-engine/src/discovery.ts` — `parseDotEnv`, `describeDiscoveredKey`, `buildUnifiedIntegrationStatuses`. En desarrollo, `GET /api/v1/external-bridge/status` fusiona `process.env` + contenido del `.env` leído vía `env-manager`; en producción solo `process.env`. Respuesta `schemaVersion: 2.0-external-bridge-unified`; ítems incluyen `iconKey`, `fromDiscovery`, `groupId` (p. ej. Supabase).

## Variables de entorno (servidor)

| Variable | Dominio |
|----------|---------|
| `FLOW_API_KEY` | Pagos (Flow) |
| `STRIPE_SECRET_KEY` | Facturación (Stripe) |
| `FINTOC_SECRET_KEY` | Banca (Fintoc) |
| `FIFER_BRIDGE_MASTER_KEY` | 64 hex — cifrado AES-256-GCM para credenciales en BD |

Marcador MOCK: vacío o `INSERT_KEY_HERE` (véase `isPlaceholderSecret` en el paquete).

## Persistencia

- Modelo Prisma `ExternalBridgeCredential` (`prisma/schema.prisma`).
- Cifrado: `src/lib/bridge-credential-crypto.ts`.
- Lectura vault: `src/lib/bridge-vault.ts`.

## APIs HTTP

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/v1/external-bridge/status` | Sesión |
| POST | `/api/v1/system/external-bridge/credentials` | Admin + **`NODE_ENV=development`** (rotación vía HTTP bloqueada en producción; usar env del despliegue) |

## UI (App Sistema)

- Ruta: `/desarrollador/conexiones-externas`.
- Componente: `src/components/system/ExternalConnectionsPanel.tsx` — hub por categoría (Nevado Técnico), cajas por integración, etiqueta **Mock / Live**, inputs de rotación solo habilitados en **localhost** (`useIsLocalhostClient`).
- Hook cliente: `src/hooks/useExternalBridge.ts` (estado agregado + `category` + `iconKey` opcional; sin secretos).
- App Desarrollador (`/desarrollador`): pestaña «Conexiones por categoría» = mismo `ExternalConnectionsPanel` que la ruta `conexiones-externas` (sin tarjetas verdes/naranjas de system-health).

## Consumo desde Finanzas (reconciliación)

| Consumidor | Mecanismo |
|------------|-----------|
| Sub-engine `finance-engine:reconciliation` | `EngineRegistry.use('external-bridge-engine').getBankingTransactions(vault)` — `vault` opcional vía `loadDecryptedVault()` |
| API | `GET` / `POST` `/api/v1/finanzas/sync-bank` — sesión Supabase; motor `finance-engine:reconciliation` |
| UI | `BankSyncBanner.tsx` — preview GET; persistencia POST; badge **Datos de simulación** si `bridgeMode === 'MOCK'` |

### Banking — `getTransactions`

- `BankingAdapter.getTransactions()` en `packages/engines/external-bridge-engine/src/adapters/banking.ts`.
- Mock: `packages/engines/external-bridge-engine/src/mocks/bank-transactions.ts` (ids `fintoc_mock_tx_*`).
- Motor padre expone `getBankingTransactions(vault?)` delegando en el adaptador.

### Pagos — `createCheckoutLink`

- `PaymentsAdapter.createCheckoutLink({ amountClp, description, transactionId, publicOrigin })` en `packages/engines/external-bridge-engine/src/adapters/payments.ts`.
- Motor padre: `createCheckoutLink(input, vault?)`.
- Firma webhook mock: `packages/engines/external-bridge-engine/src/payment-webhook.ts` (`signPaymentWebhookToken` / `verifyPaymentWebhookToken`), variable `FIFER_PAYMENT_WEBHOOK_SECRET` (fallback solo desarrollo).

## Webhooks HTTP (receptor)

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/v1/webhooks/payments/mock` | Cuerpo `{ transactionId, sig }` — `sig` = HMAC del id (mismo algoritmo que el link mock) |
| POST | `/api/v1/webhooks/payments/flow` | `Authorization: Bearer` igual a `FLOW_WEBHOOK_SECRET` o `FIFER_PAYMENT_WEBHOOK_SECRET`; cuerpo `{ transactionId, status? }` |

Efecto: localizar `Transaction` por `id`, `source === 'payment_checkout'`, `status === 'PENDIENTE'` → `COMPLETADO` y acreditar saldo (`INGRESO`). Tras éxito (no idempotente duplicado), `queueMicrotask` → `triggerAutoInvoiceAfterPaymentCheckout(transactionId, publicOrigin)` en `finance-engine:billing`.

### Facturación / DTE — `emitInvoice`

- `BillingAdapter.emitInvoice({ transactionId, customerData, items, totals, publicOrigin })` en `packages/engines/external-bridge-engine/src/adapters/billing.ts`.
- Mock DTE: `packages/engines/external-bridge-engine/src/mocks/billing-dte.ts` — devuelve `folio`, `url_pdf` (ruta API PDF simulado), `token_sii`.
- Firma HMAC reutiliza `FIFER_PAYMENT_WEBHOOK_SECRET` (mismo eje que pagos) donde aplique.
- Motor padre: `emitInvoice(input, vault?)`.
- Sub-engine `finance-engine:billing`: mapeo OpenFactura-compatible + IVA 19% (`openfactura-mapper.ts`).

| Campo Prisma | Uso |
|--------------|-----|
| `dteFolio` | Folio DTE (string) |
| `dtePdfUrl` | URL de descarga (mock apunta a `/api/v1/finanzas/billing/mock-pdf`) |
| `dteStatus` | `emitido` \| `pendiente` \| `error` |

| API | Rol |
|-----|-----|
| `POST /api/v1/finanzas/billing/emit` | Emisión manual (sesión) |
| `GET /api/v1/finanzas/billing/mock-pdf?tx=` | PDF simulado (sesión, solo `dteStatus === 'emitido'`) |

## UI Finanzas

- `POST /api/v1/finanzas/checkout` — sesión; crea PENDIENTE + devuelve `checkoutUrl`.
- `src/app/(dashboard)/finanzas/PaymentGeneratorBox.tsx` — genera link y `window.open`.
- Página pública `src/app/payment-mock/page.tsx` — confirma pago simulado vía POST al webhook mock.
- `src/app/(dashboard)/finanzas/BillingHistoryBox.tsx` — historial DTE, descarga PDF, emisión manual para ingresos no-checkout (o checkout con error de emisión).
