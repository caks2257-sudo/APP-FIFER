"use client";

import { useCallback, useState } from "react";
import { BoxLoader } from "@/components/core/BoxLoader";
import { boxManifestContent } from "./boxManifests";

/**
 * Slot Content del Command Center: `BoxLoader` + manifiesto JIT + reintento que remonta el boundary.
 */
export function ContentDashboardBox() {
  const [errorBoundaryResetKey, setErrorBoundaryResetKey] = useState(0);

  const handleRetry = useCallback(() => {
    setErrorBoundaryResetKey((k) => k + 1);
  }, []);

  return (
    <BoxLoader
      manifest={boxManifestContent}
      userRole="user"
      hasActiveSubscription
      hasValidByok
      errorBoundaryResetKey={errorBoundaryResetKey}
      onRetry={handleRetry}
    />
  );
}
