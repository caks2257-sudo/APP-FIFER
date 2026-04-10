"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import { loadV0BoxModule } from "@/components/v0-ingestion/registry";
import type { FiferV0BoxProps } from "@/components/v0-ingestion/types";
import { FallbackSkeleton } from "./FallbackSkeleton";

export type V0BoxLoaderProps = {
  manifest: IFiferBoxManifest;
  /** Props adicionales para el default export del módulo v0 (p. ej. `reloadNonce` en Ingestor). */
  jitChildProps?: Record<string, unknown>;
};

/**
 * Carga el default export de `v0-ingestion/boxes/*` según `manifest.boxId` (JIT).
 * Un chunk por Box; `next/dynamic` muestra skeleton alineado al layout mientras el JS descarga.
 */
export function V0BoxLoader({ manifest, jitChildProps }: V0BoxLoaderProps) {
  const { boxId, layout } = manifest;
  const { minWidth, minHeight, isResizable } = layout;

  const Lazy = useMemo(
    () =>
      dynamic(
        () => loadV0BoxModule(boxId),
        {
          loading: () => (
            <FallbackSkeleton layout={{ minWidth, minHeight, isResizable }} />
          ),
          ssr: false,
        }
      ),
    [boxId, minWidth, minHeight, isResizable]
  );

  const props: FiferV0BoxProps = { manifest, ...jitChildProps };
  return <Lazy {...props} />;
}
