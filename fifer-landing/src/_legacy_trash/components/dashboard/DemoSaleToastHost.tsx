"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFinanceReport } from "@/lib/fifer-api";

const POLL_MS = 12_000;

/**
 * Polling ligero del ledger vía reporte financiero: toast estilo FIFER al detectar nueva comisión.
 */
export function DemoSaleToastHost() {
  const [toast, setToast] = useState<string | null>(null);
  const lastTopIdRef = useRef<string | null>(null);

  const poll = useCallback(async () => {
    const res = await fetchFinanceReport();
    if (!res.success || !res.data?.ledger_recent?.length) return;

    const top = res.data.ledger_recent[0];
    if (!top?.id) return;

    const prev = lastTopIdRef.current;
    if (
      prev !== null &&
      top.id !== prev &&
      (top.type === "referral_earn" || top.type === "sale_commission") &&
      Math.abs(top.amount) > 0
    ) {
      const amt = Math.abs(top.amount).toFixed(2);
      setToast(`🚀 ¡Nueva venta detectada! +$${amt} USD`);
      window.setTimeout(() => setToast(null), 7000);
    }
    lastTopIdRef.current = top.id;
  }, []);

  useEffect(() => {
    void poll();
  }, [poll]);

  useEffect(() => {
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 right-6 z-[100] max-w-sm"
    >
      <div className="rounded-xl border-2 border-fifer-yellow/90 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-5 py-4 font-sans font-semibold tracking-tight text-zinc-50 shadow-[0_0_48px_rgba(234,179,8,0.28)] ring-2 ring-fifer-yellow/25">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fifer-yellow">FIFER Live</p>
        <p className="mt-1 text-sm leading-snug text-zinc-100">{toast}</p>
      </div>
    </div>
  );
}
