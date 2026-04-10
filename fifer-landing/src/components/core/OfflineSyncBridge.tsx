"use client";

import { useEffect } from "react";
import { syncOfflineQueue } from "@/lib/offline-sync";

/**
 * Site Mode: listener `online` + sync al montar si hay red y cola pendiente
 * (recuperación tras visitas a obra en Chicureo con señal inestable).
 */
export function OfflineSyncBridge() {
  useEffect(() => {
    const run = () => {
      if (typeof navigator === "undefined" || !navigator.onLine) return;
      void syncOfflineQueue();
    };

    window.addEventListener("online", run);
    run();

    return () => window.removeEventListener("online", run);
  }, []);

  return null;
}
