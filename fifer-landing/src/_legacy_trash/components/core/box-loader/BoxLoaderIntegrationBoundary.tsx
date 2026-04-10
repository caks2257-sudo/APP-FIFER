"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import { FallbackError } from "./FallbackError";
import { FallbackLockedApi } from "./FallbackLockedApi";
import { isIntegrationFailure } from "./integrationFailure";

export type BoxLoaderChildStack = "v0" | "lovable";

export type BoxLoaderIntegrationBoundaryProps = {
  boxId: string;
  childStack: BoxLoaderChildStack;
  onRetry?: () => void;
  /** Al cambiar (p. ej. tras reintento padre), el boundary vuelve a montar el árbol. */
  resetKey?: number | string;
  children: ReactNode;
};

type State = { error: Error | null };

/**
 * Aísla fallos de render en hijos (p. ej. hooks Supabase en bundles Lovable).
 * Política: Lovable → siempre Ghost; v0 → Ghost si parece fallo de integración, si no FallbackError.
 */
export class BoxLoaderIntegrationBoundary extends Component<
  BoxLoaderIntegrationBoundaryProps,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Fifer BoxLoader ${this.props.boxId}]`, error.message, info.componentStack);
  }

  componentDidUpdate(prevProps: BoxLoaderIntegrationBoundaryProps) {
    const { resetKey } = this.props;
    if (resetKey !== undefined && resetKey !== prevProps.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    const { children, childStack, onRetry, boxId } = this.props;

    if (!error) {
      return children;
    }

    const ghost =
      childStack === "lovable" || isIntegrationFailure(error);

    if (ghost) {
      return (
        <FallbackLockedApi
          ghostVariant="integration"
          title="Servicio no disponible"
          subtitle={
            error.message
              ? `No pudimos completar la conexión (p. ej. Supabase o red). ${error.message.slice(0, 180)}`
              : "No pudimos completar la conexión con el servicio. El resto del panel sigue disponible."
          }
        >
          <div
            className="min-h-[160px] w-full bg-zinc-900/25"
            aria-hidden
            data-fifer-box-integration-fallback={boxId}
          />
        </FallbackLockedApi>
      );
    }

    return <FallbackError message={error.message} onRetry={onRetry} />;
  }
}

export function resolveChildStack(
  manifest: IFiferBoxManifest,
  override?: BoxLoaderChildStack
): BoxLoaderChildStack {
  if (override) return override;
  return manifest.uiProvenance ?? "v0";
}
