"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFinanceReport, type WeeklyIncomeBucket } from "@/lib/fifer-api";

const POLL_MS = 20_000;

/**
 * Mini gráfico de ingresos semanales (mismo dataset que Finanzas) para el Command Center.
 */
export function WeeklyIncomeSparkline() {
  const [weekly, setWeekly] = useState<WeeklyIncomeBucket[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchFinanceReport();
    if (!res.success || !res.data) {
      setErr(String(res.error || "Error"));
      setWeekly([]);
      return;
    }
    setErr(null);
    setWeekly(res.data.weekly_income_usd?.length ? res.data.weekly_income_usd : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  const maxWeek = weekly.reduce((m, w) => Math.max(m, w.amount_usd), 0) || 1;

  return (
    <Card className="h-full border-zinc-800 bg-zinc-900/50 shadow-[0_0_40px_rgba(234,179,8,0.06)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-zinc-100">Ingresos semanales</CardTitle>
        <p className="text-xs font-normal text-zinc-500">
          Ledger · <span className="text-fifer-yellow/90">referral_earn</span> +{" "}
          <span className="text-fifer-yellow/90">sale_commission</span>
        </p>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {err && <p className="text-xs text-amber-400/90">{err}</p>}
        {weekly.length === 0 && !err && (
          <p className="text-sm text-zinc-500">Sin movimientos en las últimas semanas.</p>
        )}
        {weekly.length > 0 && (
          <div className="flex h-36 items-end gap-1.5 border-b border-zinc-800/90 pb-2 sm:gap-2">
            {weekly.map((w) => {
              const h = Math.max(10, (w.amount_usd / maxWeek) * 100);
              return (
                <div key={w.week_start} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full max-w-[40px] rounded-t bg-gradient-to-t from-fifer-yellow to-amber-400/35 shadow-[0_-4px_20px_rgba(234,179,8,0.15)]"
                    style={{ height: `${h}%` }}
                    title={`$${w.amount_usd.toFixed(2)}`}
                  />
                  <span className="max-w-full truncate text-[10px] text-zinc-500" title={w.label}>
                    {w.label.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
