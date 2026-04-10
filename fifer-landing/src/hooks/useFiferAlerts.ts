"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAlertStore, dispatchFiferAlert, dismissFiferAlert, type FiferAlertItem } from "@/store/useAlertStore";
import { getInactiveIntegrations } from "@/lib/integration-xray-snapshot";

export type { FiferAlertLevel } from "@/types/fifer-alert";
export type { FiferAlertItem } from "@/store/useAlertStore";
export { dispatchFiferAlert, dismissFiferAlert };

export interface UseFiferAlertsOptions {
  /**
   * Si es `true`, al montar se disparan alertas **IA_INSIGHT** por cada integración 🔴
   * del snapshot alineado con `_xray_INTEGRATIONS.md` (dedupe por sesión).
   * Usar solo en **`FiferAlertHost`** para evitar duplicar el bootstrap.
   */
  syncIntegrationXRay?: boolean;
  /** Ruta al hacer clic en «Revisar autosanación» (integraciones inactivas). */
  autosanacionPath?: string;
}

/**
 * Conscious Notification System — suscripción al store + bootstrap desde Integrations X-Ray (🔴 → autosanación).
 */
export function useFiferAlerts(options: UseFiferAlertsOptions = {}) {
  const { syncIntegrationXRay = false, autosanacionPath = "/finance" } = options;
  const router = useRouter();

  const alerts = useAlertStore((s) => s.alerts);
  const dismiss = useAlertStore((s) => s.dismiss);
  const clearAll = useAlertStore((s) => s.clearAll);
  const markSessionDispatched = useAlertStore((s) => s.markSessionDispatched);
  const hasSessionDispatched = useAlertStore((s) => s.hasSessionDispatched);
  const dispatch = useAlertStore((s) => s.dispatch);

  const dispatchAlert = useCallback(
    (payload: Omit<FiferAlertItem, "id" | "createdAt"> & { id?: string }) => dispatch(payload),
    [dispatch]
  );

  useEffect(() => {
    if (!syncIntegrationXRay) return;

    const inactive = getInactiveIntegrations();
    for (const entry of inactive) {
      const sourceKey = `integration:${entry.id}`;
      if (hasSessionDispatched(sourceKey)) continue;

      dispatch({
        level: "IA_INSIGHT",
        title: `Conciencia FIFER · ${entry.label}`,
        body: `El mapa de integraciones marca este servicio como inactivo (🔴).\n${entry.inactiveReason}\n\nAcción sugerida: ${entry.requiredAction}`,
        sourceKey,
        actionLabel: "Revisar autosanación",
        onAction: () => {
          router.push(autosanacionPath);
        },
      });
      markSessionDispatched(sourceKey);
    }
  }, [syncIntegrationXRay, autosanacionPath, router, dispatch, hasSessionDispatched, markSessionDispatched]);

  return {
    alerts,
    dispatchAlert,
    dismiss,
    clearAll,
  };
}
