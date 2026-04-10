"use client";

import { useFiferAlerts } from "@/hooks/useFiferAlerts";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";
import type { FiferAlertItem } from "@/store/useAlertStore";
import type { FiferAlertLevel } from "@/types/fifer-alert";

const LEVEL_STYLES: Record<
  FiferAlertLevel,
  { border: string; titleColor: string; shellClass?: string }
> = {
  INFO: {
    border: "rgba(59, 130, 246, 0.45)",
    titleColor: "#93c5fd",
  },
  WARNING: {
    border: `${FIFER_ELECTRIC_YELLOW}55`,
    titleColor: FIFER_ELECTRIC_YELLOW,
  },
  IA_INSIGHT: {
    border: `${FIFER_ELECTRIC_YELLOW}40`,
    titleColor: "#fef9c3",
    shellClass: "fifer-alert-ia-insight",
  },
};

function AlertCard({ alert, onDismiss }: { alert: FiferAlertItem; onDismiss: () => void }) {
  const lv = LEVEL_STYLES[alert.level];
  const shellClass = lv.shellClass ?? "";

  return (
    <div
      role="status"
      data-fifer-alert-level={alert.level}
      data-fifer-alert-id={alert.id}
      className={shellClass}
      style={{
        borderRadius: "0.75rem",
        border: `1px solid ${lv.border}`,
        background:
          alert.level === "IA_INSIGHT"
            ? undefined
            : alert.level === "INFO"
              ? "rgba(30, 58, 138, 0.28)"
              : "rgba(10, 15, 30, 0.92)",
        color: "#e4e4e7",
        padding: "12px 14px",
        maxWidth: 380,
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        fontFamily: 'ui-sans-serif, system-ui, "Inter", "Geist", sans-serif',
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: "0 0 6px 0",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: lv.titleColor,
              fontWeight: 700,
            }}
          >
            {alert.level === "IA_INSIGHT" ? "IA · Conciencia" : alert.level === "WARNING" ? "Aviso" : "Info"}
          </p>
          <p style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{alert.title}</p>
          {alert.body ? (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#a1a1aa",
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {alert.body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar alerta"
          style={{
            flexShrink: 0,
            border: "1px solid #3f3f46",
            background: "rgba(24,24,27,0.9)",
            color: "#a1a1aa",
            borderRadius: 6,
            width: 28,
            height: 28,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {alert.actionLabel && alert.onAction ? (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => {
              alert.onAction?.();
            }}
            style={{
              border: `1px solid ${FIFER_ELECTRIC_YELLOW}55`,
              background: "rgba(234, 179, 8, 0.1)",
              color: "#fef9c3",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {alert.actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Host fijo para el dispatcher de alertas (v0 puede sustituir por burbuja de chat).
 * Montar una sola vez en el layout del dashboard (o raíz).
 */
export function FiferAlertHost({
  syncIntegrationXRay = true,
  autosanacionPath = "/finance",
}: {
  syncIntegrationXRay?: boolean;
  autosanacionPath?: string;
}) {
  const { alerts, dismiss } = useFiferAlerts({ syncIntegrationXRay, autosanacionPath });

  if (!alerts.length) return null;

  return (
    <div
      data-fifer-alert-host="true"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, pointerEvents: "auto" }}>
        {alerts.map((a) => (
          <AlertCard key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />
        ))}
      </div>
    </div>
  );
}
