"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCostSavings, type CostSavingsPayload } from "@/lib/fifer-api";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

export default function CostSavingsCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CostSavingsPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchCostSavings();
    if (!res.success || !res.data) {
      setError(res.error || "No se pudo cargar el ahorro");
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savings = data?.total_savings_month ?? 0;
  const pct = data?.optimization_pct_of_baseline ?? 0;
  const highlightGreen = savings > 0;

  return (
    <section
      className="relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-xl border bg-fifer-card/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-sm"
      style={{
        borderColor: highlightGreen ? "rgba(52, 211, 153, 0.35)" : "rgba(234, 179, 8, 0.28)",
        boxShadow: highlightGreen
          ? "0 0 40px rgba(52, 211, 153, 0.08), 0 20px 50px rgba(0,0,0,0.35)"
          : "0 0 28px rgba(234, 179, 8, 0.06), 0 20px 50px rgba(0,0,0,0.35)",
      }}
      aria-labelledby="cost-savings-heading"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full opacity-40 blur-xl" style={{ background: FIFER_ELECTRIC_YELLOW }} />

      <div>
        <p
          id="cost-savings-heading"
          className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-400"
        >
          Smart Task Router
        </p>
        <h2 className="mt-1 text-sm font-bold text-zinc-100">Monitor de ahorros IA</h2>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-zinc-700/60" />
          <div className="h-3 w-full max-w-sm animate-pulse rounded bg-zinc-700/40" />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-3">
            <p className="text-xs font-medium text-zinc-500">Ahorro total este mes</p>
            <p
              className={`mt-1 font-mono text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl ${
                highlightGreen ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]" : "text-amber-300"
              }`}
            >
              {formatUsd(savings)}
            </p>
            {data?.month_utc ? (
              <p className="mt-1 text-[11px] text-zinc-500">Periodo UTC: {data.month_utc}</p>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-400">
            {pct > 0 ? (
              <>
                Optimizando aprox.{" "}
                <span className="font-semibold text-zinc-200">{pct}%</span> de los costos respecto al baseline premium,
                mediante enrutamiento open-source (
                <span className="text-emerald-400/90">Groq</span>,{" "}
                <span className="text-emerald-400/90">DeepSeek</span>,{" "}
                <span className="text-emerald-400/90">fal</span>
                ).
              </>
            ) : (
              <>
                Cuando el router elija motores económicos frente al baseline premium (Claude / GPT-4o / DALL·E), verás
                ahorro aquí. OSS típicos:{" "}
                <span style={{ color: FIFER_ELECTRIC_YELLOW }} className="font-medium">
                  Groq
                </span>
                , DeepSeek, fal.
              </>
            )}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => void load()}
        className="mt-4 w-fit rounded-lg border border-zinc-600/80 bg-zinc-900/50 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-amber-500/40 hover:text-zinc-100"
      >
        Actualizar
      </button>
    </section>
  );
}
