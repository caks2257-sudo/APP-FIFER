"use client";

import { useLayoutStore } from "@/store/useLayoutStore";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";

/**
 * Interruptor global Demo vs Real (persistido en `useLayoutStore.isDemoMode`).
 * Temporal: botón flotante hasta integrar en shell definitivo.
 */
export function DemoModeFloatingToggle() {
  const isDemoMode = useLayoutStore((s) => s.isDemoMode);
  const toggleDemoMode = useLayoutStore((s) => s.toggleDemoMode);

  return (
    <button
      type="button"
      data-fifer-demo-mode={isDemoMode ? "demo" : "real"}
      onClick={() => toggleDemoMode()}
      title={isDemoMode ? "Cambiar a datos reales (API)" : "Volver a datos de demostración"}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        padding: "10px 14px",
        borderRadius: 999,
        border: `1px solid ${FIFER_ELECTRIC_YELLOW}55`,
        background: isDemoMode ? "rgba(234, 179, 8, 0.12)" : "#0b1224",
        color: isDemoMode ? "#fef9c3" : "#e4e4e7",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.04em",
        cursor: "pointer",
        boxShadow: isDemoMode
          ? `0 0 0 1px ${FIFER_ELECTRIC_YELLOW}33, 0 12px 32px rgba(0,0,0,0.35)`
          : "0 12px 32px rgba(0,0,0,0.35)",
      }}
    >
      {isDemoMode ? "MODO DEMO" : "MODO REAL"}
    </button>
  );
}
