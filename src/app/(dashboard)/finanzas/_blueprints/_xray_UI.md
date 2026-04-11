# Plano Visual — Finanzas

## Shell

- Contenedor de página: `src/app/(dashboard)/finanzas/page.tsx` dentro del layout `(dashboard)` (`max-w-7xl` en el padre).
- Fondo de sección: **Deep Navy** `#0A0F1E`; bloques y tablas con borde `#1E293B` y fondo `#0A0F1E` o `#111827` donde aplica.

## Componentes

| Archivo | Rol |
|---------|-----|
| `BalanceCard.tsx` | Muestra etiqueta «Saldo actual» y el monto en tipografía grande (`text-[#F9FAFB]`, `font-mono`); metadato de moneda base en gris `#64748B`. |
| `TransactionList.tsx` | Tabla de hasta 10 filas: fecha, concepto, chip de tipo (`INGRESO` resaltado en **Electric Yellow** `#EAB308` sobre fondo amarillo tenue; `EGRESO` en gris), monto con prefijo `+` o `−` (montos de ingreso en `#EAB308`), estado. Vacío: mensaje centrado en gris. |
| `NewTransactionModal.tsx` | Overlay `bg-black/70`, panel con borde `#1E293B`, campos monto / tipo / concepto con foco amarillo; botón primario **Confirmar movimiento** en `#EAB308` y texto `#0A0F1E`; botón secundario cancelar sin amarillo. |
| `page.tsx` | Cabecera título + botón **Registrar movimiento** (`#EAB308` / texto oscuro); bloque de error opcional; `BalanceCard` + `TransactionList`; pie con `SmartInsightWidget` bajo separador `#1E293B`. |

## Paleta Nevado Técnico (aplicada)

- **Electric Yellow** `#EAB308`: botones «Registrar movimiento» y «Confirmar movimiento»; montos de ingreso en tabla; anillo de foco en inputs del modal.
- Texto principal `#F9FAFB`, secundario `#94A3B8` / `#64748B`.
- Sin amarillo en fondos de tarjeta; contraste sobrio.
