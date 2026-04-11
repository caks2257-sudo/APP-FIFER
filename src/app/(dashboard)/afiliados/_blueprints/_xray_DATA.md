# Plano de Datos — Afiliados

## Cliente

- **`useUserDnaStore`:** lectura de `coreProfile.role` para el gate de administración en `page.tsx`.
- **`SmartInsightWidget`:** contexto vacío `{}` en `contextData`; identificadores `moduleId` / `boxId` anteriores.

## Servidor

- Sin endpoint HTTP dedicado bajo `src/app/api/v1/afiliados/` en esta versión de la app; persistencia de negocio sigue el esquema Prisma compartido documentado en `_xray_DATABASE.md`.
