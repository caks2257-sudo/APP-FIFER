'use client';

import { useState } from 'react';

import type { TransaccionInput } from '@/types/schemas';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: TransaccionInput) => Promise<{ ok: boolean; message?: string }>;
};

export default function NewTransactionModal({ open, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [concept, setConcept] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const n = Number(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      setFormError('Ingrese un monto válido mayor a 0');
      return;
    }
    setSending(true);
    const result = await onSubmit({ amount: n, type, concept });
    setSending(false);
    if (result.ok) {
      setAmount('');
      setConcept('');
      setType('INGRESO');
      onClose();
    } else {
      setFormError(result.message ?? 'No se pudo registrar');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finanzas-modal-title"
        className="w-full max-w-md rounded-xl border border-[#1E293B] bg-[#0A0F1E] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="finanzas-modal-title" className="text-lg font-semibold text-[#F9FAFB]">
          Registrar movimiento
        </h2>
        <p className="mt-1 text-sm text-[#94A3B8]">Ingreso o egreso contable en su cuenta FIFER.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fx-amount" className="block text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
              Monto
            </label>
            <input
              id="fx-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-2.5 text-sm text-[#F9FAFB] focus:border-[#EAB308] focus:outline-none focus:ring-2 focus:ring-[#EAB308]/35"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="fx-type" className="block text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
              Tipo
            </label>
            <select
              id="fx-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'INGRESO' | 'EGRESO')}
              className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-2.5 text-sm text-[#F9FAFB] focus:border-[#EAB308] focus:outline-none focus:ring-2 focus:ring-[#EAB308]/35"
            >
              <option value="INGRESO">INGRESO</option>
              <option value="EGRESO">EGRESO</option>
            </select>
          </div>

          <div>
            <label htmlFor="fx-concept" className="block text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
              Concepto
            </label>
            <input
              id="fx-concept"
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-2.5 text-sm text-[#F9FAFB] focus:border-[#EAB308] focus:outline-none focus:ring-2 focus:ring-[#EAB308]/35"
              placeholder="Ej. Honorarios arquitectura"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-300" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-[#EAB308] px-5 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E] disabled:opacity-60"
            >
              {sending ? 'Guardando…' : 'Confirmar movimiento'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#1E293B] bg-transparent px-5 py-2.5 text-sm font-medium text-[#94A3B8] hover:bg-[#1E293B]/40"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
