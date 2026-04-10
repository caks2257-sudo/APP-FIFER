"use client";

import type { FiferDashboardModuleId } from "@/lib/module-biome";
import { resolveModuleBiome } from "@/lib/module-biome";

export type AiSyncUiStatus = "idle" | "syncing" | "done" | "error";

type Props = {
  /** Bioma visual (MASTER: grid 12 — usar dentro de `col-span-*`). */
  moduleId: FiferDashboardModuleId;
  status: AiSyncUiStatus;
  message?: string;
};

/**
 * Estado Meta-Sync / telemetría — colores del bioma (Esmeralda / Azul / Yellow).
 */
export function AiSyncStatusStrip({ moduleId, status, message }: Props) {
  const biome = resolveModuleBiome(moduleId);
  const accent = biome.primary;

  if (status === "idle") return null;

  const label =
    status === "syncing"
      ? "Sincronizando metadatos de proveedores…"
      : status === "done"
        ? "Catálogo IA actualizado"
        : "Error de sincronización";

  return (
    <div
      className="col-span-12 grid grid-cols-12 gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-md"
      role="status"
      aria-live="polite"
      data-fifer-ai-sync={status}
    >
      <div
        className="col-span-12 flex flex-wrap items-center gap-3 sm:col-span-8"
        style={{ borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 12 }}
      >
        {status === "syncing" ? (
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
        ) : null}
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {message ? <span className="text-xs text-zinc-500">{message}</span> : null}
      </div>
      <p className="col-span-12 text-[10px] uppercase tracking-[0.16em] text-zinc-600 sm:col-span-4 sm:text-right">
        Bioma · {moduleId}
      </p>
    </div>
  );
}
