"use client";

import { useCallback, useMemo } from "react";
import { useFinanceStore, type LedgerTransaction } from "@/store/useFinanceStore";

export type ConsumeSparkResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; reason: "insufficient"; balance: number };

/**
 * Puerta de consumo de **Chispas IA**: debita saldo, escribe en el ledger y expone señales para `BoxLoader`.
 * Ej.: `consumeSpark(2, "Análisis ROI Chicureo", { moduleId: "finance" })`.
 */
export function useCostTracker() {
  const walletBalance = useFinanceStore((s) => s.walletBalance);
  const transactions = useFinanceStore((s) => s.transactions);
  const spendSpark = useFinanceStore((s) => s.spendSpark);
  const topUp = useFinanceStore((s) => s.topUp);

  const canUseAI = walletBalance > 0;
  /** Alineado con `useFinanceStore.getState().isAiBlocked()`. */
  const isAiBlocked = walletBalance <= 0;

  const consumeSpark = useCallback(
    (
      amount: number,
      description: string,
      meta?: { boxId?: string; moduleId?: string }
    ): ConsumeSparkResult => {
      const ok = spendSpark(amount, description, meta);
      if (!ok) {
        return { ok: false, reason: "insufficient", balance: useFinanceStore.getState().walletBalance };
      }
      return { ok: true, balanceAfter: useFinanceStore.getState().walletBalance };
    },
    [spendSpark]
  );

  const state = useMemo(
    () => ({
      walletBalance,
      transactions: transactions as LedgerTransaction[],
      canUseAI,
      isAiBlocked,
      consumeSpark,
      topUp,
    }),
    [walletBalance, transactions, canUseAI, isAiBlocked, consumeSpark, topUp]
  );

  return state;
}
