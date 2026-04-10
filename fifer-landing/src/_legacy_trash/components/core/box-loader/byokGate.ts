import type { IFiferBoxManifest } from "@/types/fifer-box";

/**
 * BYOK First (`.cursorrules`): si alguna dependencia marca `requiresBYOK` y no hay llave válida,
 * el orquestador debe degradar al `fallbackStrategy` del manifest (p. ej. Ghost Mode).
 */
export function anyDependencyRequiresByok(
  deps: IFiferBoxManifest["dataDependencies"]
): boolean {
  return deps.some((d) => d.requiresBYOK);
}

export function byokSatisfied(
  manifest: IFiferBoxManifest,
  hasValidByok: boolean | undefined
): boolean {
  if (!anyDependencyRequiresByok(manifest.dataDependencies)) return true;
  return hasValidByok === true;
}
