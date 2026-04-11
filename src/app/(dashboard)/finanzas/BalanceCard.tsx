'use client';

import { formatMoneyAmount } from './formatMoney';

type Props = {
  balance: string;
  currency: string;
  loading: boolean;
};

export default function BalanceCard({ balance, currency, loading }: Props) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0A0F1E] p-6 shadow-[0_0_0_1px_rgba(30,41,59,0.5)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
        Saldo actual
      </p>
      {loading ? (
        <div className="mt-3 h-12 w-48 animate-pulse rounded-lg bg-[#1E293B]" aria-hidden />
      ) : (
        <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight text-[#F9FAFB]">
          {formatMoneyAmount(balance, currency)}
        </p>
      )}
      <p className="mt-2 text-xs text-[#64748B]">Moneda base: {currency}</p>
    </div>
  );
}
