'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentMockInner() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const sig = searchParams.get('sig');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const confirm = async () => {
    if (!transactionId || !sig) {
      setMessage('Parámetros incompletos');
      setStatus('err');
      return;
    }
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/v1/webhooks/payments/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          sig,
          event: 'payment.succeeded',
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setStatus('ok');
      setMessage('Pago simulado registrado. Puede cerrar esta pestaña.');
    } catch (e) {
      setStatus('err');
      setMessage(e instanceof Error ? e.message : 'Error');
    }
  };

  if (!transactionId || !sig) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] px-4 py-16 text-center text-slate-400">
        <p>Enlace de pago inválido o incompleto.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] px-4 py-16 text-[#F9FAFB]">
      <div className="mx-auto max-w-md rounded-xl border border-[#EAB308]/30 bg-[#111827] p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#EAB308]">
          Simulación de checkout
        </p>
        <h1 className="mt-2 text-lg font-semibold">Confirmar pago (mock)</h1>
        <p className="mt-2 font-mono text-xs text-slate-400 break-all">
          Transacción: {transactionId}
        </p>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={status === 'loading' || status === 'ok'}
          className="mt-6 w-full rounded-lg bg-[#EAB308] py-3 text-sm font-semibold text-[#0A0F1E] transition hover:bg-[#EAB308]/90 disabled:opacity-50"
        >
          {status === 'loading' ? 'Procesando…' : status === 'ok' ? 'Completado' : 'Confirmar pago simulado'}
        </button>
        {message ? (
          <p
            className={`mt-4 text-sm ${status === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function PaymentMockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0F1E] px-4 py-16 text-center text-slate-400">
          Cargando…
        </div>
      }
    >
      <PaymentMockInner />
    </Suspense>
  );
}
