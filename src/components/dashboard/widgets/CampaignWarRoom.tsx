'use client';

import { useCallback, useState } from 'react';

import { useUIStore } from '@/store/ui-store';

type ExtractionPlatform = 'aliexpress' | 'mercadolibre' | 'custom_url';

const PLATFORMS: { id: ExtractionPlatform; label: string }[] = [
  { id: 'aliexpress', label: 'AliExpress' },
  { id: 'mercadolibre', label: 'MercadoLibre' },
  { id: 'custom_url', label: 'URL propia' },
];

const SOCIALS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
] as const;

export function CampaignWarRoom() {
  const setOverlayWidgets = useUIStore((s) => s.setOverlayWidgets);
  const [platform, setPlatform] = useState<ExtractionPlatform>('mercadolibre');
  const [socials, setSocials] = useState<Record<(typeof SOCIALS)[number]['id'], boolean>>({
    instagram: true,
    tiktok: false,
    facebook: true,
  });
  const [postFrequency, setPostFrequency] = useState('2 por día');
  const [budget, setBudget] = useState('150000');

  const toggleSocial = useCallback((id: (typeof SOCIALS)[number]['id']) => {
    setSocials((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSubmit = useCallback(() => {
    console.log('[CampaignWarRoom]', {
      platform,
      socials: Object.entries(socials)
        .filter(([, on]) => on)
        .map(([k]) => k),
      postFrequency,
      budget,
    });
    setOverlayWidgets(null);
  }, [budget, platform, postFrequency, setOverlayWidgets, socials]);

  return (
    <div className="@container w-full rounded-xl border border-white/[0.08] bg-gradient-to-b from-slate-950/95 via-[#0c1222] to-slate-950/90 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <header className="mb-8 border-b border-white/10 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Afiliados · automatización
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
          Configuración de Campaña Automatizada
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Define la fuente de scraping, canales de difusión y parámetros del bot antes de activar
          la campaña. Vista previa del flujo que verá el usuario final.
        </p>
      </header>

      <div className="flex flex-col gap-8 @[520px]:gap-10">
        <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 @[520px]:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            1 · Fuente de datos
          </h2>
          <p className="mt-1 text-sm text-slate-400">Plataforma de extracción de catálogo / ofertas.</p>
          <label className="mt-4 block text-[13px] text-slate-300" htmlFor="war-room-platform">
            Plataforma
          </label>
          <select
            id="war-room-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as ExtractionPlatform)}
            className="mt-1.5 w-full max-w-md rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-[#EAB308]/40 focus:ring-1 focus:ring-[#EAB308]/25"
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 @[520px]:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            2 · Distribución
          </h2>
          <p className="mt-1 text-sm text-slate-400">Redes donde publicará el bot.</p>
          <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {SOCIALS.map(({ id, label }) => (
              <li key={id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 transition hover:border-white/15">
                  <input
                    type="checkbox"
                    checked={socials[id]}
                    onChange={() => toggleSocial(id)}
                    className="size-4 rounded border-white/20 bg-slate-900 text-[#EAB308] focus:ring-[#EAB308]/40"
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 @[520px]:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            3 · Ajustes del bot
          </h2>
          <p className="mt-1 text-sm text-slate-400">Ritmo y presupuesto estimado (simulación).</p>
          <div className="mt-4 grid gap-4 @[520px]:grid-cols-2">
            <div>
              <label className="text-[13px] text-slate-300" htmlFor="war-room-freq">
                Frecuencia de publicación
              </label>
              <input
                id="war-room-freq"
                value={postFrequency}
                onChange={(e) => setPostFrequency(e.target.value)}
                placeholder="p. ej. 3 por semana"
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#EAB308]/40 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/25"
              />
            </div>
            <div>
              <label className="text-[13px] text-slate-300" htmlFor="war-room-budget">
                Presupuesto inicial estimado (CLP)
              </label>
              <input
                id="war-room-budget"
                type="text"
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 focus:border-[#EAB308]/40 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/25"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 @[520px]:flex-row @[520px]:items-center @[520px]:justify-between">
          <p className="text-xs text-slate-500">
            Los bots no se ejecutan aún; este panel es una vista de configuración.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl border border-[#EAB308]/35 bg-[#EAB308]/15 px-5 py-3 text-sm font-medium text-[#FDE68A] shadow-sm transition hover:bg-[#EAB308]/25"
          >
            🚀 Generar Campaña y Activar Bots
          </button>
        </div>
      </div>
    </div>
  );
}
