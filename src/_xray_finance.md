# 🩻 X-Ray Local: Finance (motor / API raíz)

> ÚLTIMA ACTUALIZACIÓN: 2026-04-07  
> ROL EN FIFER: Capa financiera (bunker, wallets, reportes vía API master) asociada al backend en `src/`.

## 🔴 ESTADO DE SALUD Y ERRORES LOCALES
- [ ] ESTADO ACTUAL: Chasis Micro-X-Ray provisionado. Pendiente detalle operativo según escaneo quirúrgico local.

## 🏗️ MAPA DE RUTAS Y LÓGICA CORE
- **Ruta Base API (consumo desde landing):** `GET /api/v1/master/finance/report` (vía `NEXT_PUBLIC_FIFER_API_BASE_URL`).
- **Lógica interna:** (completar según módulos en `src/`)

## 🧩 FRONTEND BOXES EXPORTADAS (Micro-Frontends)
- Boxes de finanzas se montan en el panel Next (`fifer-landing`) con `BoxLoader` + manifest.

## 🔗 CONTRATOS EXTERNOS Y DEPENDENCIAS
- **Bases de datos:** `fifer_finance.*` (según esquema desplegado).

## 🔑 VARIABLES DE ENTORNO REQUERIDAS
- (backend y workers; listar en la siguiente iteración)
