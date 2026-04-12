# Snapshot — useExternalBridge (§12 + §14 + §15)

Toda App generada con `npm run fifer:create-app` incluye el hook `useExternalBridge` en `page.tsx` para alinear el shell con el **External Bridge Engine** (estado MOCK/PROD agregado y **Macro-Pilares** del hub).

## Referencias

- Implementación: `src/hooks/useExternalBridge.ts`
- API estado: `GET /api/v1/external-bridge/status`
- ADN: `.cursorrules` §12 (Orquestación externa), §14 (Macro-Pilares: `INTELIGENCIA_ARTIFICIAL`, `FINANZAS_PAGOS`, `ECOMMERCE`, `INFRAESTRUCTURA`, `REDES_SOCIALES`), §15 (orden físico del `.env` por bloques)
- Blueprint global: `docs/blueprints/_xray_EXTERNAL_BRIDGE.md`

## Uso

El hook no expone secretos; devuelve `integrations` (cada ítem incluye `category`, `mode` MOCK/PROD, `iconKey` opcional, `fromDiscovery`, `groupId` para Supabase multi-llave, etc.), `summary.mockCount` / `summary.prodCount` y `refresh()`. La API `GET /api/v1/external-bridge/status` usa `schemaVersion` 2.x (unificado + auto-descubrimiento desde `.env` en desarrollo).

## Detección automática de categorías

Consumir `integration.category` desde el payload. El hub de producto (`ExternalConnectionsPanel`) agrupa por los **cinco** Macro-Pilares por defecto. Nuevas integraciones del Bridge aparecen con `category` en `BRIDGE_ENV_BINDINGS` o por prefijos en `describeDiscoveredKey` (`packages/engines/external-bridge-engine/src/discovery.ts`).
