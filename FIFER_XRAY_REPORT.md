# FIFER X-Ray Report (State of the Union)

Fecha: 2026-04-07  
Alcance: Frontend + Backend + Base de Datos + Configuracion

## 1) Estado del Frontend

### Implementado
- Landing moderna en `fifer-landing` (Next.js App Router) con home y secciones de marketing:
  - `fifer-landing/src/app/page.tsx`
  - `fifer-landing/src/components/Hero.tsx`
  - `fifer-landing/src/components/Pricing/Pricing.tsx`
  - `fifer-landing/src/components/Footer.tsx`
- Rutas publicas de soporte legal/auth:
  - `fifer-landing/src/app/privacy/page.tsx`
  - `fifer-landing/src/app/terms/page.tsx`
  - `fifer-landing/src/app/auth/success/page.tsx`
- Modulo de ajustes BYOK en frontend temporal:
  - `fifer-landing/temp-frontend/src/pages/AISettings.tsx`
- Cliente API tipado para motores, finanzas, stock, Woo y vault:
  - `fifer-landing/temp-frontend/src/services/api_client.ts`

### Pendiente / Incompleto
- Dashboard operativo unificado no visible en `temp-frontend` (no hay `Index.tsx`, `CampaignCreator.tsx`, `AffiliateFeed.tsx`, `FinanceReport.tsx` dentro de ese arbol actual).
- Billetera/Finance UI no conectada en el frontend temporal (existe contrato API pero no pantalla activa en `temp-frontend`).
- Selector IA dinamico (UI) no evidenciado en frontend temporal (hay `getAvailableEngines`, pero no componente de seleccion montado).
- Integracion total "Landing Lovable -> App interna" incompleta: existe landing separada y, en paralelo, un frontend temporal reducido.

## 2) Estado del Backend

### Endpoints existentes (gateway)
Archivo: `src/api/routes/public/master.routes.js`
- `POST /automated-play`
- `POST /orchestrate`
- `POST /url-campaign`
- `GET /engines`
- `GET /ai-settings/keys`
- `POST /ai-settings/test-key`
- `POST /ai-settings/keys`
- `DELETE /ads/vault/:provider`
- `POST /publish-draft`
- `GET /finance/report`
- `POST /affiliates/sync-stock`
- `POST /affiliates/woocommerce/top-products`
- `POST /ads/register-id`

### Adaptadores de afiliados vivos
Ruta base: `src/modules/affiliates/adapters`
- **AliExpress:** `aliexpress_adapter.js` (firma MD5 + modo mock/ghost)
- **Mercado Libre:** `meli_adapter.js` (API items + batch stock + conversion USD)
- **Amazon:** `amazon_adapter.js` (PA-API SigV4 + fallback)
- **WooCommerce:** `woocommerce_adapter.js` (REST + auth + top products + batch stock)
- **Shopify:** `shopify_adapter.js` (normalizacion y modo mock)
- **Web Scraper:** `web_scraper_adapter.js`

### Servicios de IA
- **Groq:** implementado en `src/services/ai/groq_adapter.js`
- **OpenAI:** presencia parcial (BYOK test y catalogo de proveedor), sin adaptador dedicado de generacion en `src/services/ai`
- **ElevenLabs:** no hay adaptador backend dedicado (solo referencias de mock no productivas)

### ESTADO DE SALUD (Delta local - servicios de contenido fifer-content)
- **Saneado:** `fifer-content/scripts/src/services/carousel_generator.js` tenia texto no-codigo inyectado al final del archivo; fue removido para restaurar parseo JS.
- **Verificado:** chequeo de sintaxis OK en `carousel_generator.js`, `reels_generator.js`, `post_generator.js` y en todos los `*.js` dentro de `fifer-content/scripts/src/services`.

## 3) Esquema actual de Base de Datos (Supabase)

### Auth / Vault
- `fifer_auth.user_api_keys`
  - Migracion: `supabase/migrations/20260412150000_user_api_keys_vault.sql`

### Finance
- `fifer_finance.wallets`
- `fifer_finance.transactions`
- Funcion atomica: `finance_apply_ai_spend`
  - Migracion: `supabase/migrations/20260411120000_financial_bunker_wallets.sql`
- `fifer_finance.exchange_rates`
  - Migracion: `supabase/migrations/20260412120000_exchange_rates.sql`

### Plataforma / Campanas / Mappings
- `fifer_platform.campaign_drafts`
  - Migracion: `supabase/migrations/20260410120000_campaign_drafts.sql`
  - Ext status inventario: `supabase/migrations/20260407190000_campaign_drafts_add_paused_status.sql`
- `fifer_platform.ad_mappings`
  - Migraciones:  
    - `supabase/migrations/20260407213000_ad_mapping.sql`  
    - `supabase/migrations/20260407224500_ad_mapping_system.sql`
- `fifer_platform.master_pipeline_publish_log`
  - Migracion: `supabase/migrations/20260409120000_master_pipeline_publish_log.sql`

### Tag-Center / Catalogos
- Esquema Tag-Center y catalogo fase 1:
  - `supabase/migrations/20260406120000_tag_center_schema.sql`
  - `supabase/migrations/20260407120000_tag_center_phase1_catalog.sql`

## 4) Brechas Criticas (Gaps) para v4.0 completa

1. **Metadata-Driven Architecture incompleta**
- No existe evidencia de Discovery Worker + Attribute Mapper + Unified UI Bridge como pipeline declarativo central.
- El enrutamiento actual sigue mayormente hardcodeado por endpoint y logica procedural.

2. **Financial Bunker v4.0 incompleto (ledger)**
- Existe `wallets` + `transactions`, pero no una tabla `fifer_finance.ledger` formal para trazabilidad contable avanzada y ROI exacto por campana con modelo de ledger.

3. **Paridad de servicios IA parcial**
- Groq esta operativo.
- OpenAI aparece en validacion BYOK/catalogo, pero no como adaptador de generacion dedicado.
- ElevenLabs no aparece integrado como servicio vivo backend.

4. **Frontend fragmentado**
- Landing principal (`fifer-landing`) y app temporal (`fifer-landing/temp-frontend`) no se ven consolidadas en una sola experiencia de dashboard/operacion.
- Varias capacidades (finanzas, selector IA, feed) existen como contrato API, pero no evidenciadas como UI montada en el frontend temporal actual.

5. **Riesgo de orden de migraciones**
- Hay migraciones de `ad_mappings` y alteraciones de `campaign_drafts` con timestamp anterior a la creacion base de `campaign_drafts`, lo que puede romper despliegues desde cero si no se controla el orden efectivo.

## 5) Conclusión Ejecutiva

FIFER ya tiene una base fuerte (BYOK cifrado, adaptadores afiliados multiproveedor, endpoints principales, wallet/transactions y exchange rates).  
Para entrar plenamente en la **v4.0 Metadata-Driven Era**, faltan tres consolidaciones clave:
- formalizar el **router/pipeline metadata-driven**,
- materializar el **ledger financiero** para ROI exacto auditable,
- unificar el **frontend operativo** en una sola superficie de producto.
