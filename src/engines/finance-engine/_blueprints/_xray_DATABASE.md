# Persistencia — finance-engine (raíz)

Persistencia: **N/A** a nivel del motor raíz. El motor no define tablas propias; la persistencia vive en **`prisma/schema.prisma` global** (cuentas, transacciones, facturación, etc.) y en la delegación a sub-motores que documentan su propio espejo en `sub-engines/*/ _blueprints/_xray_DATABASE.md`.
