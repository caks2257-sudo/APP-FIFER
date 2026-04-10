import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { IFiferBoxLayout } from "@/types/fifer-box";

function skeletonMinStyle(layout?: IFiferBoxLayout): CSSProperties | undefined {
  if (!layout) return undefined;
  const { minWidth, minHeight } = layout;
  const s: CSSProperties = {};
  if (minWidth > 12) {
    s.minWidth = minWidth;
    s.width = "100%";
  }
  if (minHeight > 6) {
    s.minHeight = minHeight;
  }
  return Object.keys(s).length ? s : undefined;
}

export type FallbackSkeletonProps = {
  className?: string;
  /** Alinea el placeholder al grid del Box (`minWidth` en columnas o px; `minHeight` en filas o px). */
  layout?: IFiferBoxLayout;
};

/** JIT / carga diferida: placeholder hasta datos reales (ROI-first: no gastar sin contexto). */
export function FallbackSkeleton({ className, layout }: FallbackSkeletonProps) {
  const minStyle = skeletonMinStyle(layout);

  return (
    <div
      className={clsx(
        "flex min-h-[140px] w-full min-w-0 flex-1 flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4",
        className
      )}
      style={minStyle}
      aria-busy
      aria-label="Cargando contenido"
    >
      <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-700/80" />
      <div className="h-3 w-full animate-pulse rounded bg-zinc-800/80" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-auto h-24 animate-pulse rounded-lg bg-zinc-800/50" />
    </div>
  );
}
