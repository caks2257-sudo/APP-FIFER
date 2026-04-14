'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AppProvisioningPayloadSchema,
  type AppProvisioningPayload,
} from '@/engines/master-app-factory/schema';
import { useRouter } from '@/i18n/navigation';
import { useUIStore } from '@/store/ui-store';
import type { WarRoomConfig } from '@/types/war-room';

export type { WarRoomConfig } from '@/types/war-room';

export type SmartWarRoomExecutePayload = {
  targetAction: WarRoomConfig['targetAction'];
  title: string;
  values: Record<string, string | boolean>;
};

export type SmartWarRoomProps = {
  config: WarRoomConfig;
  onExecute?: (payload: SmartWarRoomExecutePayload) => void;
};

function deriveBusinessName(
  config: WarRoomConfig,
  values: Record<string, string | boolean>,
): string {
  const m = config.title.match(/^Blueprint for\s+(.+?)\s+App$/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const bn = values.business_name;
  if (typeof bn === 'string' && bn.trim()) return bn.trim();
  const t = config.title.trim();
  return t.length > 0 ? t : 'Mis Apps';
}

function isAbkupferBusinessName(businessName: string): boolean {
  const n = businessName.toLowerCase();
  return n.includes('abkupfer') || n.includes('ab kupfer') || n.includes('kupfer');
}

function buildProvisioningPayload(
  config: WarRoomConfig,
  values: Record<string, string | boolean>,
): { payload: AppProvisioningPayload } | { error: string } {
  const businessName = deriveBusinessName(config, values);
  const primaryRaw = values.primary_url;
  const primaryUrl =
    typeof primaryRaw === 'string' && primaryRaw.trim()
      ? primaryRaw.trim()
      : undefined;
  const requestedModules = Object.entries(values)
    .filter(([key, v]) => key.startsWith('enable_') && v === true)
    .map(([key]) => key.replace(/^enable_/, ''))
    .filter(Boolean);

  if (requestedModules.length === 0) {
    return { error: 'Selecciona al menos un módulo para provisionar.' };
  }

  const sourceRaw = values.source_platform;
  const sourcePlatform =
    typeof sourceRaw === 'string' && sourceRaw.trim() ? sourceRaw.trim() : undefined;

  const parsed = AppProvisioningPayloadSchema.safeParse({
    businessName,
    primaryUrl,
    requestedModules,
    sourcePlatform,
    targetAction: config.targetAction,
  });
  if (!parsed.success) {
    return {
      error:
        'Los datos no cumplen el esquema de provisión (revisa URL y módulos).',
    };
  }
  return { payload: parsed.data };
}

function collectInitialValues(config: WarRoomConfig): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (field.type === 'checkbox') {
        out[field.id] = false;
      } else {
        out[field.id] = field.defaultValue ?? '';
      }
    }
  }
  return out;
}

export function SmartWarRoom({ config, onExecute }: SmartWarRoomProps) {
  const router = useRouter();
  const initial = useMemo(() => collectInitialValues(config), [config]);
  const [values, setValues] = useState<Record<string, string | boolean>>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setValues(collectInitialValues(config));
    setSubmitError(null);
  }, [config]);

  const setField = useCallback((id: string, v: string | boolean) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      const execPayload: SmartWarRoomExecutePayload = {
        targetAction: config.targetAction,
        title: config.title,
        values: { ...values },
      };

      const built = buildProvisioningPayload(config, values);
      if ('error' in built) {
        setSubmitError(built.error);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/v1/factory/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(built.payload),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          jobId?: string;
          status?: string;
        };
        if (!res.ok) {
          setSubmitError(
            typeof data.error === 'string' ? data.error : `Error HTTP ${res.status}`,
          );
          return;
        }

        console.log('[SmartWarRoom] War room payload (audit):', execPayload);
        console.info(
          `[SmartWarRoom] Creación de app en segundo plano (job ${data.jobId ?? 'n/a'}). Te avisaremos cuando esté lista.`,
        );
        const abkupferFlow = isAbkupferBusinessName(built.payload.businessName);
        if (abkupferFlow) {
          useUIStore.getState().setOverlayWidgets(null);
          useUIStore.getState().setProvisioningApp('Abkupfer', true);
          useUIStore
            .getState()
            .setMisAppModules('ab-kupfer', built.payload.requestedModules);
          router.push('/dashboard/mis-apps/ab-kupfer');
          window.setTimeout(() => {
            useUIStore.getState().setProvisioningApp('Abkupfer', false);
          }, 10000);
        } else {
          useUIStore.getState().setOverlayWidgets(null);
        }
        onExecute?.(execPayload);
      } catch {
        setSubmitError('Error de red al contactar la Master App Factory.');
      } finally {
        setSubmitting(false);
      }
    },
    [config, onExecute, router, values],
  );

  return (
    <div className="@container w-full rounded-xl border border-white/[0.08] bg-gradient-to-b from-slate-950/95 via-[#0c1222] to-slate-950/90 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] sm:p-6">
      <header className="mb-6 border-b border-white/10 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Meta-OS · War Room
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
          {config.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{config.description}</p>
        <p className="mt-2 inline-flex rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-mono text-slate-400">
          targetAction:{' '}
          <span className="ml-1 text-[#EAB308]/90">{config.targetAction}</span>
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
          La provisión la orquesta el motor Mis Apps (Master App Factory) en segundo plano; este
          formulario solo envía el encargo y cierra el overlay al confirmar el envío.
        </p>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-8">
        {config.sections.map((section) => (
          <section
            key={section.title}
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 @[520px]:p-5"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {section.title}
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {section.fields.map((field) => {
                const id = `war-room-${field.id}`;
                const val = values[field.id];

                if (field.type === 'checkbox') {
                  return (
                    <label
                      key={field.id}
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-200"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={val === true}
                        onChange={(e) => setField(field.id, e.target.checked)}
                        className="size-4 rounded border-white/20 bg-slate-900 text-[#EAB308] focus:ring-[#EAB308]/40"
                      />
                      {field.label}
                    </label>
                  );
                }

                if (field.type === 'select') {
                  const opts = field.options ?? [];
                  return (
                    <div key={field.id}>
                      <label className="text-[13px] text-slate-300" htmlFor={id}>
                        {field.label}
                      </label>
                      <select
                        id={id}
                        value={typeof val === 'string' ? val : ''}
                        onChange={(e) => setField(field.id, e.target.value)}
                        className="mt-1.5 w-full max-w-md rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 focus:border-[#EAB308]/40 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/25"
                      >
                        <option value="">—</option>
                        {opts.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                const inputType = field.type === 'url' ? 'url' : 'text';
                return (
                  <div key={field.id}>
                    <label className="text-[13px] text-slate-300" htmlFor={id}>
                      {field.label}
                    </label>
                    <input
                      id={id}
                      type={inputType}
                      value={typeof val === 'string' ? val : ''}
                      onChange={(e) => setField(field.id, e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#EAB308]/40 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/25"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {submitError ? (
          <p className="text-sm text-red-300/90" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 @[520px]:flex-row @[520px]:items-center @[520px]:justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl border border-[#EAB308]/35 bg-[#EAB308]/15 px-5 py-3 text-sm font-medium text-[#FDE68A] shadow-sm transition hover:bg-[#EAB308]/25 disabled:opacity-50"
          >
            {submitting ? 'Enviando a la factory…' : config.actionButtonText}
          </button>
        </div>
      </form>
    </div>
  );
}
