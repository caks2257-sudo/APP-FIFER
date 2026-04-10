"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchCampaignDrafts, type CampaignDraftListItem } from "@/lib/fifer-api";

function formatPlatformLabel(raw: string | undefined): string {
  if (!raw?.trim()) return "Plataforma";
  const s = raw.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CampaignDraftHistorySection({
  intro = "Borradores recientes. Cuando Make confirme la publicación, el estado pasa a published y verás el enlace al video o post.",
  refreshNonce = 0,
}: {
  intro?: string;
  /** Incrementar tras publicar para recargar la lista sin desmontar. */
  refreshNonce?: number;
}) {
  const [draftHistory, setDraftHistory] = useState<CampaignDraftListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadDraftHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetchCampaignDrafts(40);
      if (res.success && res.data?.drafts) {
        setDraftHistory(res.data.drafts);
      } else {
        setHistoryError(res.error || "No se pudo cargar el historial");
        setDraftHistory([]);
      }
    } catch (e) {
      setHistoryError(String(e));
      setDraftHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDraftHistory();
  }, [loadDraftHistory, refreshNonce]);

  return (
    <div className="space-y-3 px-6 pb-6">
      <p className="text-xs text-zinc-500">{intro}</p>
      {historyError && <p className="text-xs text-amber-400">{historyError}</p>}
      {historyLoading && (
        <p className="flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Cargando…
        </p>
      )}
      {!historyLoading && draftHistory.length === 0 && !historyError && (
        <p className="text-sm text-zinc-500">Aún no hay borradores.</p>
      )}
      <ul className="space-y-3">
        {draftHistory.map((d) => {
          const platformRaw =
            typeof d.metadata?.publish_callback_platform === "string"
              ? d.metadata.publish_callback_platform
              : "";
          const platform = formatPlatformLabel(platformRaw);
          const showLink = d.status === "published" && Boolean(d.published_url?.trim());
          return (
            <li
              key={d.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={d.status === "published" ? "yellow" : "muted"}>{d.status}</Badge>
                  <span className="truncate text-xs text-zinc-500">{d.source_url}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-zinc-600">{d.id}</p>
              </div>
              {showLink && d.published_url ? (
                <Button
                  type="button"
                  className="shrink-0 bg-fifer-yellow text-zinc-950 hover:bg-fifer-yellow/90"
                  onClick={() => window.open(d.published_url!, "_blank", "noopener,noreferrer")}
                >
                  🔗 Ver en {platform}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
