'use client';

import { useState } from 'react';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';

import BalanceCard from './BalanceCard';
import NewTransactionModal from './NewTransactionModal';
import TransactionList from './TransactionList';
import { useFinanzas } from './useFinanzas';

export default function FinanzasPage() {
  const { account, transactions, loading, error, refetch, crearTransaccion } = useFinanzas();
  const [modalOpen, setModalOpen] = useState(false);

  const balance = account?.balance ?? '0';
  const currency = account?.currency ?? 'CLP';

  return (
    <BoxErrorBoundary>
      <div className="flex w-full flex-col gap-8 pb-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">
              Hub de Finanzas - Visión General
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Resumen del módulo Finanzas: saldo, movimientos y contratos relacionados en FIFER.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#EAB308] px-5 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E]"
          >
            Registrar movimiento
          </button>
        </header>

        {error && (
          <div className="rounded-lg border border-amber-500/30 bg-[#111827] px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <BalanceCard balance={balance} currency={currency} loading={loading} />

        <TransactionList transactions={transactions} currency={currency} loading={loading} />

        <section className="border-t border-[#1E293B] pt-8">
          <SmartInsightWidget
            moduleId="finanzas"
            boxId="finanzas-page"
            contextData={{}}
            systemInstruction={
              'Genera insights de valor operativo para el módulo «Finanzas» (id: finanzas). Prioriza riesgos, oportunidades y próximos pasos concretos alineados con FIFER v6.0.'
            }
          />
        </section>
      </div>

      <NewTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          const r = await crearTransaccion(payload);
          if (r.ok) {
            await refetch();
            return { ok: true };
          }
          return { ok: false, message: r.message };
        }}
      />
    </BoxErrorBoundary>
  );
}
