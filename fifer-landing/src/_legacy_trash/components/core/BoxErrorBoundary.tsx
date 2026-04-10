"use client";

import { clsx } from "clsx";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { FiferBoxFallbackStrategy } from "@/types/fifer-box";

export type BoxErrorBoundaryProps = {
  children: ReactNode;
  /** Estrategia visual al capturar un error (p. ej. `manifest.fallbackStrategy ?? "error-message"`). */
  fallbackStrategy?: FiferBoxFallbackStrategy;
  /** Si se omite, no se muestra reintento (Box `retryable: false`). */
  onReset?: () => void;
};

type BoxErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

const DEFAULT_STRATEGY: FiferBoxFallbackStrategy = "error-message";

function resolveStrategy(strategy: FiferBoxFallbackStrategy | undefined): FiferBoxFallbackStrategy {
  return strategy ?? DEFAULT_STRATEGY;
}

function truncateDetail(text: string, max = 160): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

// --- Sub-componentes: Ghost Mode / degradación por slot (flujo normal, sin absolute hardcodeado) ---

/** Skeleton continuo: pulse en slate oscuro + hilo azul eléctrico + toque golden (MASTER: Navy / Electric Blue / Golden Yellow). */
function GhostSkeletonFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      className={clsx(
        "flex min-h-[140px] w-full flex-col gap-3 rounded-xl border border-slate-800/90 bg-slate-950/90 p-4",
        "shadow-[inset_0_1px_0_0_rgba(56,189,248,0.06)] ring-1 ring-fifer-yellow/10"
      )}
      aria-busy={!onRetry}
      aria-label={onRetry ? "Ghost Mode: error recuperable — reintentar disponible" : "Ghost Mode: cargando placeholder"}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
        <div className="h-2 max-w-[8rem] flex-1 rounded-full bg-fifer-yellow/30" />
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-500/25 to-transparent opacity-80" />
      <div className="h-4 w-1/3 max-w-[10rem] animate-pulse rounded-md bg-slate-800" />
      <div className="h-3 w-full animate-pulse rounded-md bg-slate-800/90" />
      <div className="h-3 w-5/6 max-w-full animate-pulse rounded-md bg-slate-900" />
      <div className="mt-1 flex flex-1 flex-col justify-end gap-2">
        <div className="h-20 w-full animate-pulse rounded-lg bg-slate-900/95 ring-1 ring-slate-800/80" />
        <div className="mx-auto h-0.5 w-1/3 rounded-full bg-gradient-to-r from-transparent via-fifer-yellow/40 to-transparent opacity-70" />
      </div>
      {onRetry ? (
        <div className="flex shrink-0 justify-center pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Ghost Mode: capas apiladas en flex (sin posicionamiento absoluto); mensaje + lienzo difuminado. */
function GhostSurfaceFallback({ message }: { message: string }) {
  return (
    <div
      className={clsx(
        "flex min-h-[140px] w-full flex-col overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950",
        "ring-1 ring-sky-500/15 shadow-[0_0_32px_rgba(14,165,233,0.06)]"
      )}
      role="alert"
    >
      <header className="shrink-0 space-y-1 border-b border-slate-800/80 bg-slate-950/95 px-4 py-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fifer-yellow">Fifer · Ghost Mode</p>
        <p className="text-sm font-semibold leading-snug text-slate-100">Módulo en pausa</p>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500">{truncateDetail(message)}</p>
      </header>
      <div className="flex min-h-[4.5rem] flex-1 flex-col justify-stretch bg-slate-900/40 p-3">
        <div
          className={clsx(
            "flex flex-1 flex-col justify-center gap-2 rounded-lg border border-slate-800/60 bg-gradient-to-br from-slate-900 to-slate-950 px-3 py-4",
            "blur-[2px] grayscale contrast-90 opacity-50 select-none"
          )}
          aria-hidden
        >
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-sky-500/40 via-sky-400/25 to-transparent" />
          <div className="h-8 rounded-md bg-slate-800/80" />
          <div className="h-2 w-2/3 rounded bg-slate-800/60" />
        </div>
      </div>
    </div>
  );
}

/** Error local: borde ámbar/rojo suave, copy de producto + detalle técnico; reintento solo si el Box es retryable. */
function GhostServiceUnavailableFallback({
  technicalMessage,
  onRetry,
}: {
  technicalMessage: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-xl px-4 py-6 text-center",
        "border border-amber-600/35 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/95",
        "shadow-[inset_0_1px_0_0_rgba(251,191,36,0.08)] ring-1 ring-red-900/25"
      )}
      role="alert"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fifer-yellow">Fifer Box</p>
        <p className="text-sm font-semibold leading-snug text-slate-100">Servicio no disponible temporalmente</p>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500">
          {truncateDetail(technicalMessage) || "Se produjo un error al mostrar este módulo."}
        </p>
      </div>
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

function renderFallbackUi(
  strategy: FiferBoxFallbackStrategy,
  error: Error,
  onRetry?: () => void
): ReactNode {
  const msg = error.message || "Error desconocido";

  switch (strategy) {
    case "hide":
      return null;
    case "skeleton":
      return <GhostSkeletonFallback onRetry={onRetry} />;
    case "ghost":
    case "ghost_mode_mock":
      return <GhostSurfaceFallback message={msg} />;
    case "error-message":
    case "error_boundary":
      return <GhostServiceUnavailableFallback technicalMessage={msg} onRetry={onRetry} />;
    default: {
      const _exhaustive: never = strategy;
      return _exhaustive;
    }
  }
}

/**
 * Cortafuegos por Error Boundary para un Fifer Box: captura errores de render en el subárbol
 * y aplica la estrategia del manifiesto sin tumbar el grid del panel.
 */
export class BoxErrorBoundary extends Component<BoxErrorBoundaryProps, BoxErrorBoundaryState> {
  static displayName = "BoxErrorBoundary";

  state: BoxErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): BoxErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[BoxErrorBoundary]", error, errorInfo.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    if (hasError && error) {
      const strategy = resolveStrategy(this.props.fallbackStrategy);
      const onRetry = this.props.onReset ? this.handleReset : undefined;
      return renderFallbackUi(strategy, error, onRetry);
    }
    return this.props.children;
  }
}
