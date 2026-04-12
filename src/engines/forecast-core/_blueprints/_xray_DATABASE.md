# Plano DATABASE — `forecast-core`

## UBICACIÓN LÓGICA

`FIFER://ENGINE/forecast-core`

## Reflejo de código

| Persistencia | Estado |
|--------------|--------|
| Tablas propias del motor | **N/A** (v1 hot compute) |
| Datos de lectura | Modelos existentes `FinancialAccount`, `Transaction` (`prisma/schema.prisma`) — solo lectura desde la ruta API; sin migraciones añadidas en v1 |

**RLS / Prisma:** sin cambios de esquema en esta fase; el caller filtra por cuenta del usuario autenticado.
