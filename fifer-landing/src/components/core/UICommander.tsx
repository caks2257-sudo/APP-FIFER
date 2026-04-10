/**
 * Spotlight Cmd+K — alias de `GlobalCommander`.
 *
 * Conciencia de contexto: pathname + sugerencias en `lib/ui-commander.ts` (`buildSpotlightContextSlashRows`).
 * Sugerencias de cajas: unión `FIFER_BOX_CATALOG` + slots de `MASTER_MODULE_REGISTRY` → `/mostrar <boxId>`.
 * Sanación: `/limpiar-layout` → `useLayoutStore.applyLayoutSanityForCommander`.
 *
 * @deprecated Preferir importar `GlobalCommander` en código nuevo.
 */
export { GlobalCommander as UICommander } from "@/components/core/GlobalCommander";
