/**
 * X-Ray Validator — reexporta API pública (solo servidor/CLI: usa `fs`).
 * - Servidor/CLI: `runXRayValidatorSync`, `runXRayValidatorCli`, `extractDeclaredModulesFromReport`, `getMonorepoRoot`
 * - Cliente: importar desde `@/utils/xray-drift-notify` (`notifyXRayDrift`, `notifyAllXRayIssues`)
 */
export {
  extractDeclaredModulesFromReport,
  getMonorepoRoot,
  runXRayValidatorCli,
  runXRayValidatorSync,
} from "@/utils/xray-validator";

export type { XRayModuleIssue, XRayValidatorResult } from "@/types/xray-health";
