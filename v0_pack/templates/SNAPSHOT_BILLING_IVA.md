# Snapshot — IVA 19% y DTE (Chile)

- **Tasa estándar producto:** 19% IVA en facturación automática/manual (`finance-engine:billing`).
- **Motor Bridge:** `BillingAdapter.emitInvoice` en `packages/engines/external-bridge-engine`.
- **Persistencia:** `Transaction.dteFolio`, `dtePdfUrl`, `dteStatus`.
- **Espejo:** `docs/blueprints/_xray_EXTERNAL_BRIDGE.md` (sección facturación).
