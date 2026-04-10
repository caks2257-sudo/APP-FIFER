/**
 * Alertas de desincronización X-Ray (solo cliente / UI).
 */
"use client";

import { dispatchFiferAlert } from "@/store/useAlertStore";

import type { XRayValidatorResult } from "@/types/xray-health";

export function notifyXRayDrift(moduleLabel: string): void {
  dispatchFiferAlert({
    level: "WARNING",
    title: `Atención: El ADN de ${moduleLabel} ha mutado.`,
    body: "Actualizando X-Ray automáticamente...",
    sourceKey: `xray-validator:${moduleLabel}`,
  });
}

export function notifyAllXRayIssues(result: XRayValidatorResult): void {
  if (!result.issues.length) return;
  for (const i of result.issues) {
    notifyXRayDrift(i.module === "(índice)" ? "FIFER_XRAY_REPORT" : i.module);
  }
}
