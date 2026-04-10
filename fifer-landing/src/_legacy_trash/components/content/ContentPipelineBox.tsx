"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useFiferData } from "@/hooks/useFiferData";
import { fetchAiCapabilities, unwrapFiferStandardResponse, type AiCapabilityRow } from "@/lib/fifer-api";

/**
 * Prueba manual de fallo JIT (aislamiento):
 * - `?fifer_content_fail=1` o `sessionStorage.setItem('fifer_jit_content_fail','1')` + recarga.
 */
function shouldSimulateContentJitFailure(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("fifer_content_fail") === "1") return true;
    if (window.sessionStorage.getItem("fifer_jit_content_fail") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function ContentPipelineSkeleton() {
  return (
    <Card className="h-full border-slate-800/90 bg-slate-950/50">
      <CardHeader className="space-y-2 pb-2">
        <div className="h-4 w-40 animate-pulse rounded-md bg-slate-800" />
        <div className="h-3 w-full max-w-sm animate-pulse rounded bg-slate-800/80" />
      </CardHeader>
      <div className="space-y-2 px-6 pb-6">
        <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-800/90" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-900" />
      </div>
    </Card>
  );
}

/**
 * Box Content — datos vía `useFiferData` → error se propaga al `BoxErrorBoundary` del `BoxLoader`.
 */
export function ContentPipelineBox() {
  const { data: rows, loading } = useFiferData<AiCapabilityRow[]>(
    async () => {
      if (shouldSimulateContentJitFailure()) {
        await new Promise((r) => setTimeout(r, 400));
        throw new Error("JIT Fetch failed for ContentBox");
      }
      const res = await fetchAiCapabilities();
      return unwrapFiferStandardResponse(res);
    },
    []
  );

  if (loading || rows === null) {
    return <ContentPipelineSkeleton />;
  }

  const active = rows.filter((r) => r.is_active).length;

  return (
    <Card className="h-full border-zinc-800 bg-zinc-900/40">
      <CardHeader>
        <CardTitle className="text-base text-zinc-100">fifer-content</CardTitle>
        <p className="text-xs font-normal text-zinc-500">
          JIT · <code className="text-fifer-yellow/90">GET /ai-capabilities</code>
        </p>
      </CardHeader>
      <div className="space-y-2 px-6 pb-6 text-sm text-zinc-400">
        <p>
          Capacidades registradas:{" "}
          <span className="font-semibold tabular-nums text-zinc-200">{rows.length}</span>
          {rows.length > 0 ? (
            <>
              {" "}
              · activas:{" "}
              <span className="tabular-nums text-fifer-yellow">{active}</span>
            </>
          ) : null}
        </p>
        <p className="text-xs leading-relaxed text-zinc-500">
          Catálogo alineado con campañas y discovery; mismos datos que el motor expone al panel.
        </p>
      </div>
    </Card>
  );
}
