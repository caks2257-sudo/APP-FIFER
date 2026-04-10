/**
 * Punto de entrada al Module Seed Worker (reexport).
 * Crea `fifer-landing/src/modules/<nombre>/` (= `src/modules/[name]` en la app Next).
 *
 * Implementación: `fifer-landing/src/utils/scaffolder.ts`
 * CLI: `npm run module:seed -- <nombre-kebab>` (raíz) o `npm run module:seed --prefix fifer-landing -- <nombre-kebab>`
 * UI: Global Commander → `/nuevo-modulo <nombre-kebab>` (dev, vía `POST /api/dev/seed-module`).
 */
export {
  createModule,
  createModuleCli,
  kebabToPascal,
  kebabToTitle,
  sanitizeModuleName,
} from "../../fifer-landing/src/utils/scaffolder";
