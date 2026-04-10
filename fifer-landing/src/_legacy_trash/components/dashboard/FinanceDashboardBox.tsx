"use client";

import { useCallback, useState } from "react";
import { BoxLoader } from "@/components/core/BoxLoader";
import { boxManifestFinance } from "./boxManifests";

/**
 * Slot Finance del Command Center: `BoxLoader` + manifiesto + reintento que remonta el boundary (JIT).
 */
export function FinanceDashboardBox() {
  const [errorBoundaryResetKey, setErrorBoundaryResetKey] = useState(0);

  const handleRetry = useCallback(() => {
    setErrorBoundaryResetKey((k) => k + 1);
  }, []);

  return (
    <BoxLoader
      manifest={boxManifestFinance}
      userRole="user"
      hasActiveSubscription
      hasValidByok
      errorBoundaryResetKey={errorBoundaryResetKey}
      onRetry={handleRetry}
    />
  );
}
