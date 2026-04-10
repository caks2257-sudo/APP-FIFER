/**
 * Entrada monorepo (carpeta `src/` motor) — ejecuta el validador X-Ray definido en `fifer-landing`.
 * @see fifer-landing/src/utils/check-health.ts
 */
import { pathToFileURL } from "node:url";
import { runXRayValidatorCli } from "../../fifer-landing/src/utils/xray-validator";

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runXRayValidatorCli();
}
