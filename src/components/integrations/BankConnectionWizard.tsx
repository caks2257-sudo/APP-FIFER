'use client';

import { CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useUIStore } from '@/store/ui-store';

type BankConnectionWizardProps = {
  appContext: string;
};

type WizardStep = 'selection' | 'credentials' | 'processing' | 'success';

const BANK_OPTIONS = ['Santander', 'Banco de Chile', 'BCI'] as const;

export default function BankConnectionWizard({ appContext }: BankConnectionWizardProps) {
  const [step, setStep] = useState<WizardStep>('selection');
  const [selectedBank, setSelectedBank] = useState<(typeof BANK_OPTIONS)[number] | null>(null);
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedContext = appContext.trim() || 'global';
  const setOverlayWidgets = useUIStore((s) => s.setOverlayWidgets);

  const subtitle = useMemo(
    () =>
      resolvedContext === 'ab-kupfer'
        ? 'Entorno aislado AB Kupfer'
        : `Contexto financiero: ${resolvedContext}`,
    [resolvedContext],
  );

  const handleConnect = () => {
    if (!selectedBank) {
      setErrorMessage('Selecciona un banco para continuar.');
      return;
    }
    if (!rut.trim() || !password.trim()) {
      setErrorMessage('Completa RUT y clave para simular la conexión.');
      return;
    }
    setErrorMessage(null);
    setStep('processing');

    window.setTimeout(() => {
      useUIStore.getState().setBankConnected(resolvedContext, true);
      setStep('success');
      window.setTimeout(() => {
        setOverlayWidgets(null);
      }, 2000);
    }, 3000);
  };

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[#EAB308]/25 bg-gradient-to-b from-[#0A0F1E] via-[#0d1426] to-[#0A0F1E] p-6 shadow-[0_0_0_1px_rgba(234,179,8,0.08)]">
      <header className="mb-6 border-b border-white/10 pb-4">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#EAB308]/35 bg-[#EAB308]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FDE68A]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Integracion Bancaria Simulada
        </p>
        <h3 className="mt-3 text-lg font-semibold text-[#F9FAFB]">Modal de Alta Seguridad</h3>
        <p className="mt-1 text-xs text-[#94A3B8]">{subtitle}</p>
      </header>

      {step === 'selection' ? (
        <section className="space-y-4">
          <p className="text-sm text-[#CBD5E1]">1) Selecciona una institución bancaria</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BANK_OPTIONS.map((bank) => {
              const active = selectedBank === bank;
              return (
                <button
                  key={bank}
                  type="button"
                  onClick={() => setSelectedBank(bank)}
                  className={`rounded-xl border px-3 py-3 text-sm transition ${
                    active
                      ? 'border-[#EAB308]/60 bg-[#EAB308]/15 text-[#FDE68A]'
                      : 'border-white/10 bg-black/20 text-[#CBD5E1] hover:border-[#EAB308]/35'
                  }`}
                >
                  {bank}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep('credentials')}
              disabled={!selectedBank}
              className="rounded-lg border border-[#EAB308]/35 bg-[#EAB308]/15 px-4 py-2 text-sm font-medium text-[#FDE68A] disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </section>
      ) : null}

      {step === 'credentials' ? (
        <section className="space-y-4">
          <p className="text-sm text-[#CBD5E1]">2) Ingresa credenciales seguras ({selectedBank})</p>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <label className="mb-2 block text-xs text-[#94A3B8]">RUT</label>
            <input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              className="mb-3 w-full rounded-lg border border-white/10 bg-[#0A0F1E] px-3 py-2 text-sm text-white outline-none focus:border-[#EAB308]/40"
              placeholder="12.345.678-9"
            />
            <label className="mb-2 block text-xs text-[#94A3B8]">Clave</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0A0F1E] px-3 py-2 text-sm text-white outline-none focus:border-[#EAB308]/40"
              placeholder="********"
            />
          </div>
          {errorMessage ? <p className="text-xs text-red-300">{errorMessage}</p> : null}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('selection')}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[#CBD5E1]"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-lg border border-[#EAB308]/35 bg-[#EAB308]/15 px-4 py-2 text-sm font-medium text-[#FDE68A]"
            >
              Conectar
            </button>
          </div>
        </section>
      ) : null}

      {step === 'processing' ? (
        <section className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#EAB308]" />
          <p className="mt-5 max-w-md text-sm text-[#CBD5E1]">
            Estableciendo conexión segura con la API bancaria...
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#94A3B8]">
            <Lock className="h-3.5 w-3.5" />
            Canal cifrado activo
          </p>
        </section>
      ) : null}

      {step === 'success' ? (
        <section className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <p className="mt-4 text-base font-semibold text-[#F9FAFB]">¡Cuentas sincronizadas!</p>
          <p className="mt-2 text-sm text-[#94A3B8]">Cerrando asistente seguro...</p>
        </section>
      ) : null}
    </div>
  );
}
