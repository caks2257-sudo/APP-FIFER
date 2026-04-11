'use client';

import { formatMoneyAmount } from './formatMoney';
import type { FinanzasTransactionJson } from './useFinanzas';

type Props = {
  transactions: FinanzasTransactionJson[];
  currency: string;
  loading: boolean;
};

export default function TransactionList({ transactions, currency, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#1E293B] bg-[#0A0F1E] p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-[#1E293B]" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-[#1E293B]/80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E293B] bg-[#0A0F1E]">
      <div className="border-b border-[#1E293B] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#F9FAFB]">Últimos movimientos</h2>
        <p className="text-xs text-[#64748B]">Hasta 10 operaciones recientes</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#1E293B] text-xs uppercase tracking-wide text-[#94A3B8]">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 text-right font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#94A3B8]">
                  No hay movimientos registrados.
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const date = new Date(t.createdAt);
                const dateStr = date.toLocaleString('es-CL', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isIngreso = t.type === 'INGRESO';
                return (
                  <tr
                    key={t.id}
                    className="border-b border-[#1E293B]/80 last:border-0 hover:bg-[#111827]/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[#CBD5E1]">{dateStr}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-[#E2E8F0]">{t.concept}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          isIngreso
                            ? 'bg-[#EAB308]/15 text-[#EAB308]'
                            : 'bg-slate-700/80 text-slate-200'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums ${
                        isIngreso ? 'text-[#EAB308]' : 'text-[#F9FAFB]'
                      }`}
                    >
                      {isIngreso ? '+' : '−'}
                      {formatMoneyAmount(t.amount, t.currency || currency)}
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{t.status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
