/**
 * Financial Bunker — ledger virtual (Chispas IA) y saldo para ROI interno.
 * Persistencia: `localStorage` (clave `FIFER_FINANCE_LEDGER_KEY`).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { appendAuditLog } from "@/store/useAuditStore";

export const FIFER_FINANCE_LEDGER_KEY = "fifer-finance-ledger";

/** Unidad virtual de consumo de IA (Chispa). */
export const DEFAULT_INITIAL_CHISPAS = 100;

export interface LedgerTransaction {
  id: string;
  /** Negativo = gasto; positivo = recarga. */
  amount: number;
  description: string;
  createdAt: number;
  meta?: { boxId?: string; moduleId?: string };
}

interface FinanceState {
  walletBalance: number;
  transactions: LedgerTransaction[];
}

interface FinanceStore extends FinanceState {
  /** Saldo ≤ 0 → el shell bloquea acciones de IA en Boxes (`BoxLoader`). */
  isAiBlocked: () => boolean;
  /** Intenta debitar; devuelve `false` si no hay saldo suficiente (sin cargo parcial). */
  spendSpark: (
    amount: number,
    description: string,
    meta?: { boxId?: string; moduleId?: string }
  ) => boolean;
  /** Recarga demo / BYOK futuro — positivo al ledger. */
  topUp: (amount: number, description?: string) => void;
}

function makeId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const MAX_TX = 300;

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      walletBalance: DEFAULT_INITIAL_CHISPAS,
      transactions: [],

      isAiBlocked: () => get().walletBalance <= 0,

      spendSpark: (amount, description, meta) => {
        if (amount <= 0) return true;
        const { walletBalance, transactions } = get();
        if (walletBalance < amount) {
          appendAuditLog(
            "FINANCE",
            `[Financial Bunker] Gasto rechazado: saldo insuficiente — ${description}`,
            { ...(meta || {}), attemptedAmount: amount, walletBalance }
          );
          return false;
        }
        const id = makeId();
        const tx: LedgerTransaction = {
          id,
          amount: -amount,
          description,
          createdAt: Date.now(),
          meta,
        };
        set({
          walletBalance: walletBalance - amount,
          transactions: [tx, ...transactions].slice(0, MAX_TX),
        });
        appendAuditLog(
          "FINANCE",
          `[Financial Bunker] Chispa IA consumida: ${description} (−${amount})`,
          { ...(meta || {}), txId: id, amount, balanceAfter: walletBalance - amount }
        );
        return true;
      },

      topUp: (amount, description = "Recarga de saldo") => {
        if (amount <= 0) return;
        const { walletBalance, transactions } = get();
        const tx: LedgerTransaction = {
          id: makeId(),
          amount,
          description,
          createdAt: Date.now(),
        };
        const balanceAfter = walletBalance + amount;
        set({
          walletBalance: balanceAfter,
          transactions: [tx, ...transactions].slice(0, MAX_TX),
        });
        appendAuditLog("FINANCE", `[Financial Bunker] Recarga: +${amount} (${description})`, {
          txId: tx.id,
          amount,
          balanceAfter,
        });
      },
    }),
    {
      name: FIFER_FINANCE_LEDGER_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        } as unknown as Storage;
      }),
      partialize: (s) => ({
        walletBalance: s.walletBalance,
        transactions: s.transactions,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<FinanceState> | null;
        if (!p) return current as FinanceStore;
        return {
          ...(current as FinanceStore),
          walletBalance:
            typeof p.walletBalance === "number" && Number.isFinite(p.walletBalance)
              ? p.walletBalance
              : (current as FinanceStore).walletBalance,
          transactions: Array.isArray(p.transactions) ? p.transactions : (current as FinanceStore).transactions,
        };
      },
    }
  )
);
