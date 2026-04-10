"use client";

import type { FiferV0BoxProps } from "../types";

/** Fallback cuando `boxId` no está en `V0_BOX_REGISTRY`. */
export default function UnknownV0Box({ manifest }: FiferV0BoxProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-500/30 bg-slate-950 p-4 text-sm text-amber-100/90"
    >
      <p className="font-semibold text-amber-200/95">v0 — Box no registrado</p>
      <p className="mt-1 text-slate-400">
        No hay módulo en <code className="rounded bg-slate-900 px-1 font-mono text-xs">v0-ingestion/boxes/</code> para{" "}
        <code className="font-mono text-amber-200">{manifest.boxId}</code>. Añade el chunk y una entrada en{" "}
        <code className="rounded bg-slate-900 px-1 font-mono text-xs">registry.ts</code>.
      </p>
    </div>
  );
}
