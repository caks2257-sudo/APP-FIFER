/**
 * Repositorio de semillas (verdad simulada) para el Living OS.
 * Contrato: `BoxProps.data` + capa `normalized` (`_xray_PROTOCOL_SHELL.md`, `utils/adapters/`).
 * Validación: `StandardBoxDataSchema` en `registry.schema.ts` (parse en cada export de *-data.ts).
 */
export * from "./finance-data";
export * from "./content-data";
export * from "./affiliate-data";
