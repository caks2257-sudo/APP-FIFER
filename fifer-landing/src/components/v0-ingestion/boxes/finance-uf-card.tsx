"use client";

import { useEffect, useState } from "react";
import { getUFValue } from "@/services/finance.service";
import type { BoxProps } from "@/types/fifer-box";

/**
 * Fifer Box compacto para mostrar indicador UF del dia.
 * Respeta Dual-Stage: si `isRefining` es true, muestra estado de pulido.
 */
export default function FinanceUfCard({ isRefining }: BoxProps) {
  const [ufDisplay, setUfDisplay] = useState("$37.850,42");
  const [isFetchingUf, setIsFetchingUf] = useState(true);
  const [ufError, setUfError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsFetchingUf(true);
    setUfError(null);

    void getUFValue()
      .then((uf) => {
        if (cancelled) return;
        setUfDisplay(uf.formatted);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUfError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsFetchingUf(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // El BoxErrorBoundary del BoxLoader captura este error y activa DiscoveryBox.
  if (ufError) {
    throw ufError;
  }

  const showRefining = Boolean(isRefining) || isFetchingUf;

  return (
    <div
      className="w-full rounded-[0.75rem] border bg-[#0A0F1E] p-4 text-zinc-100"
      style={{ borderColor: "#059669" }}
      data-fifer-box="finance-uf-card"
      data-fifer-biome="finance"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#059669]">Indicador UF</p>
      {showRefining ? (
        <p className="mt-3 text-sm text-zinc-400">Pulido de prompt en curso...</p>
      ) : (
        <p className="mt-3 text-2xl font-bold text-[#EAB308]">{ufDisplay}</p>
      )}
    </div>
  );
}
