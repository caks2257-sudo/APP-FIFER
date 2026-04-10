"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  FaAmazon,
  FaFacebook,
  FaInstagram,
  FaShopify,
  FaStore,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa6";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchPlatformProfitRanking,
  type PlatformProfitRankRow,
} from "@/lib/fifer-api";

const POLL_MS = 25_000;

function platformIcon(platformKey: string) {
  const k = platformKey.toLowerCase();
  const cls = "h-5 w-5 shrink-0 text-zinc-200";
  switch (k) {
    case "tiktok":
      return <FaTiktok className={cls} aria-hidden />;
    case "instagram":
      return <FaInstagram className={cls} aria-hidden />;
    case "facebook":
      return <FaFacebook className={cls} aria-hidden />;
    case "youtube":
      return <FaYoutube className={cls} aria-hidden />;
    case "shopify":
      return <FaShopify className={cls} aria-hidden />;
    case "amazon":
      return <FaAmazon className={cls} aria-hidden />;
    case "mercadolibre":
    case "aliexpress":
      return <FaStore className={cls} aria-hidden />;
    default:
      return <FaStore className={cls} aria-hidden />;
  }
}

export function PlatformRankingCard() {
  const [rows, setRows] = useState<PlatformProfitRankRow[]>([]);
  const [windowDays, setWindowDays] = useState(7);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchPlatformProfitRanking();
    if (!res.success || !res.data) {
      setErr(String(res.error || "Error"));
      setRows([]);
      return;
    }
    setErr(null);
    setWindowDays(res.data.window_days ?? 7);
    setRows(Array.isArray(res.data.ranking) ? res.data.ranking : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  return (
    <Card className="h-full border-zinc-800 bg-gradient-to-br from-zinc-900/80 via-zinc-950/90 to-black shadow-[0_0_48px_rgba(234,179,8,0.08)] ring-1 ring-fifer-yellow/10">
      <CardHeader className="pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fifer-yellow">Platform profit</p>
        <CardTitle className="text-lg font-bold tracking-tight text-zinc-50">Ranking semanal</CardTitle>
        <p className="text-xs font-normal text-zinc-500">
          Top 5 por comisiones <span className="text-zinc-400">sale_commission</span> · últimos {windowDays} días
        </p>
      </CardHeader>

      <div className="space-y-1 px-6 pb-6">
        {err && <p className="mb-2 text-xs text-amber-400/90">{err}</p>}

        {rows.length === 0 && !err && (
          <p className="py-4 text-sm text-zinc-500">
            Aún no hay datos de plataforma en el ledger. Publica campañas y ejecuta ventas simuladas para poblar el
            ranking.
          </p>
        )}

        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={`${row.platform_key}-${row.rank}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-mono text-sm font-bold text-fifer-yellow">
                {row.rank}
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900/90 ring-1 ring-zinc-700/80">
                {platformIcon(row.platform_key)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{row.display_name}</p>
                <p className="font-mono text-sm font-bold tabular-nums text-[#FFE135] drop-shadow-[0_0_12px_rgba(255,225,53,0.35)]">
                  ${row.total_usd.toFixed(2)}{" "}
                  <span className="text-[10px] font-normal uppercase tracking-wide text-zinc-500">USD</span>
                </p>
              </div>
              {row.trend_up && (
                <span
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-400 ring-1 ring-emerald-500/35"
                  title={`Subió vs semana anterior (antes #${row.previous_rank})`}
                >
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">Mejor posición respecto a la semana anterior</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
