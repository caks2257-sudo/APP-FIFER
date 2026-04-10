"use client";

import { useCallback, useState } from "react";
import { BoxLoader } from "@/components/core/BoxLoader";
import { boxManifestIngestor } from "./boxManifests";

/**
 * Slot Ingestor: `BoxLoader` + `errorBoundaryResetKey` / `onRetry` — al reintentar se incrementa la key y
 * `reloadNonce` en el hijo para volver a ejecutar el fetch JIT sin recargar la página.
 */
export function IngestorDashboardBox() {
  const [errorBoundaryResetKey, setErrorBoundaryResetKey] = useState(0);

  const handleRetry = useCallback(() => {
    setErrorBoundaryResetKey((k) => k + 1);
  }, []);

  return (
    <BoxLoader
      manifest={boxManifestIngestor}
      userRole="user"
      hasActiveSubscription
      hasValidByok
      errorBoundaryResetKey={errorBoundaryResetKey}
      onRetry={handleRetry}
      jitChildProps={{ reloadNonce: errorBoundaryResetKey }}
    />
  );
}
