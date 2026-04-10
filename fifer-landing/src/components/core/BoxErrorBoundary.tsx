"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { getHttpStatusFromError } from "@/lib/fifer-http-error";

type State = { hasError: boolean; error: Error | null };

export type BoxErrorFallbackRenderArgs = {
  error: Error;
  /** HTTP cuando el error lo expone (`FiferHttpError`, `statusCode`, o mensaje `HTTP nnn`). */
  httpStatus: number | undefined;
};

export class BoxErrorBoundary extends Component<
  {
    children: ReactNode;
    /** Si se define, sustituye el fallback rojo por defecto (sin acceso al error). */
    fallback?: ReactNode;
    /**
     * Fallback con el error capturado — preferir para Discovery (401/403) y mensaje real.
     * Tiene prioridad sobre `fallback` cuando hay error.
     */
    renderFallback?: (args: BoxErrorFallbackRenderArgs) => ReactNode;
    /** Rompecircuitos / telemetría: fallo de render del micro-UI. */
    onRenderFailure?: (error: Error) => void;
  },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onRenderFailure?.(error);
    console.error("[BoxErrorBoundary]", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      if (this.props.renderFallback) {
        return this.props.renderFallback({
          error: err,
          httpStatus: getHttpStatusFromError(err),
        });
      }
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          style={{
            border: "1px solid #ef4444",
            background: "#2b1113",
            color: "#fecaca",
            borderRadius: 10,
            padding: 12,
          }}
        >
          Error en módulo aislado
        </div>
      );
    }
    return this.props.children;
  }
}
