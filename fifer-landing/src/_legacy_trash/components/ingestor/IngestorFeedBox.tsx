"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useFiferData } from "@/hooks/useFiferData";
import { fetchCampaignDrafts, type CampaignDraftListItem } from "@/lib/fifer-api";

/**
 * Prueba QA de fallo JIT:
 * - `?fifer_ingestor_fail=1` o `sessionStorage.setItem('fifer_jit_ingestor_fail','1')` + recarga.
 */
function shouldSimulateIngestorJitFailure(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("fifer_ingestor_fail") === "1") return true;
    if (window.sessionStorage.getItem("fifer_jit_ingestor_fail") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function IngestorFeedSkeleton() {
  return (
    <Card className="h-full border-amber-500/20 bg-zinc-950/60 ring-1 ring-amber-500/10">
      <CardHeader className="space-y-2 pb-2">
        <div className="h-4 w-44 animate-pulse rounded-md bg-zinc-800" />
        <div className="h-3 w-full max-w-sm animate-pulse rounded bg-zinc-800/80" />
      </CardHeader>
      <div className="space-y-2 px-6 pb-6">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-amber-500/15" />
        <div className="h-3 w-full animate-pulse rounded bg-zinc-900" />
      </div>
    </Card>
  );
}

export type IngestorFeedBoxProps = {
  /**
   * Lo incrementa `IngestorDashboardBox` al mismo tiempo que `errorBoundaryResetKey` en `BoxLoader`.
   * Así el `useFiferData` vuelve a ejecutar el fetch tras **Reintentar** sin recargar la página.
   */
  reloadNonce?: number;
};

/**
 * Box Ingestor — JIT: borradores de campaña (`fetchCampaignDrafts`).
 */
export function IngestorFeedBox({ reloadNonce = 0 }: IngestorFeedBoxProps) {
  const { data: drafts, loading } = useFiferData<CampaignDraftListItem[]>(
    async () => {
      if (shouldSimulateIngestorJitFailure()) {
        await new Promise((r) => setTimeout(r, 400));
        throw new Error("JIT Fetch failed for IngestorBox");
      }
      const res = await fetchCampaignDrafts(24);
      if (!res.success) {
        throw new Error("JIT Fetch failed for IngestorBox");
      }
      return Array.isArray(res.data?.drafts) ? res.data.drafts : [];
    },
    [reloadNonce]
  );

  if (loading || drafts === null) {
    return <IngestorFeedSkeleton />;
  }

  const published = drafts.filter((d) => d.status === "published").length;
  const processing = drafts.filter((d) => d.status === "processing_external").length;

  return (
    <Card className="h-full border-amber-500/35 bg-zinc-900/50 shadow-[0_0_32px_rgba(245,158,11,0.06)] ring-1 ring-amber-500/15">
      <CardHeader>
        <CardTitle className="text-base text-zinc-100">fifer-ingestor</CardTitle>
        <p className="text-xs font-normal text-zinc-500">
          JIT · <code className="text-amber-500">GET /campaign-drafts</code>
        </p>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6 text-sm text-zinc-400">
        <p>
          Borradores en pipeline:{" "}
          <span className="font-semibold tabular-nums text-amber-500">{drafts.length}</span>
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-400">
            Publicadas: <span className="font-semibold tabular-nums">{published}</span>
          </span>
          <span className="rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1 text-amber-500/90">
            En proceso: <span className="font-semibold tabular-nums">{processing}</span>
          </span>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          Mismo contrato que Campañas: ingestión URL vía <code className="text-amber-500/90">postUrlCampaign</code> en el
          flujo completo.
        </p>
      </div>
    </Card>
  );
}
