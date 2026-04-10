"use client";

import { Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";
import {
  fetchAiCapabilities,
  fetchUserSubscription,
  type AiCapabilityRow,
  type UserSubscriptionPayload,
} from "@/lib/fifer-api";

function canUsePremium(sub: UserSubscriptionPayload | null): boolean {
  if (!sub) return false;
  if (sub.subscription_tier === "pro" && !sub.expired_pro) return true;
  if (sub.byok_openai || sub.byok_anthropic) return true;
  return false;
}

export default function CampaignsCreatorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<AiCapabilityRow[]>([]);
  const [textModels, setTextModels] = useState<AiCapabilityRow[]>([]);
  const [subscription, setSubscription] = useState<UserSubscriptionPayload | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [subRes, vRes, mRes] = await Promise.all([
      fetchUserSubscription(),
      fetchAiCapabilities({ type: "voice" }),
      fetchAiCapabilities({ type: "text_model" }),
    ]);
    if (!subRes.success || !subRes.data) {
      setError(subRes.error || "No se pudo cargar la suscripción");
      setSubscription(null);
    } else {
      setSubscription(subRes.data);
    }
    if (!vRes.success) {
      setError((e) => e || vRes.error || "Voces no disponibles");
      setVoices([]);
    } else {
      setVoices(vRes.data);
    }
    if (!mRes.success) {
      setError((e) => e || mRes.error || "Modelos no disponibles");
      setTextModels([]);
    } else {
      setTextModels(mRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const premiumOk = canUsePremium(subscription);

  function handlePickVoice(row: AiCapabilityRow) {
    const pro = Boolean(row.requires_pro);
    if (pro && !premiumOk) {
      setProModalOpen(true);
      return;
    }
    setSelectedVoiceId(row.id);
  }

  function handlePickModel(row: AiCapabilityRow) {
    const pro = Boolean(row.requires_pro);
    if (pro && !premiumOk) {
      setProModalOpen(true);
      return;
    }
    setSelectedModelId(row.id);
  }

  return (
    <main
      className="min-h-screen px-5 py-6 text-zinc-100 md:px-8"
      style={{
        background: "linear-gradient(180deg, #0A0F1E 0%, #050810 100%)",
      }}
    >
      <header className="mb-6 border-b border-amber-400/15 pb-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: FIFER_ELECTRIC_YELLOW }}>
          Campañas
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-50">Creador de campañas</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Voces (ElevenLabs) y modelos de texto del catálogo. Los recursos PRO están marcados; en plan Free el router usa
          rutas optimizadas salvo que traigas tu propia API key (BYOK).
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-zinc-700/50" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-zinc-800/40" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="voices-heading">
            <h2 id="voices-heading" className="text-sm font-bold text-zinc-200">
              Voces
            </h2>
            <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-3">
              {voices.map((row) => {
                const pro = Boolean(row.requires_pro);
                const selected = selectedVoiceId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => handlePickVoice(row)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? "border-amber-400/60 bg-amber-500/10 text-zinc-50"
                          : "border-zinc-600/60 bg-zinc-950/50 text-zinc-200 hover:border-zinc-500"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {pro ? (
                          <>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-[0_0_12px_rgba(234,179,8,0.35)]"
                              style={{
                                background: `linear-gradient(135deg, ${FIFER_ELECTRIC_YELLOW}22, ${FIFER_ELECTRIC_YELLOW}44)`,
                                color: FIFER_ELECTRIC_YELLOW,
                                border: `1px solid ${FIFER_ELECTRIC_YELLOW}66`,
                              }}
                            >
                              PRO
                            </span>
                            <Lock className="h-3.5 w-3.5 opacity-80" style={{ color: FIFER_ELECTRIC_YELLOW }} aria-hidden />
                          </>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="models-heading">
            <h2 id="models-heading" className="text-sm font-bold text-zinc-200">
              Modelos de texto
            </h2>
            <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-3">
              {textModels.map((row) => {
                const pro = Boolean(row.requires_pro);
                const selected = selectedModelId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => handlePickModel(row)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? "border-amber-400/60 bg-amber-500/10 text-zinc-50"
                          : "border-zinc-600/60 bg-zinc-950/50 text-zinc-200 hover:border-zinc-500"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{row.name}</span>
                        <span className="text-[11px] text-zinc-500">{row.provider}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {pro ? (
                          <>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-[0_0_12px_rgba(234,179,8,0.35)]"
                              style={{
                                background: `linear-gradient(135deg, ${FIFER_ELECTRIC_YELLOW}22, ${FIFER_ELECTRIC_YELLOW}44)`,
                                color: FIFER_ELECTRIC_YELLOW,
                                border: `1px solid ${FIFER_ELECTRIC_YELLOW}66`,
                              }}
                            >
                              PRO
                            </span>
                            <Lock className="h-3.5 w-3.5 opacity-80" style={{ color: FIFER_ELECTRIC_YELLOW }} aria-hidden />
                          </>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {proModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-modal-title"
        >
          <div className="max-w-md rounded-2xl border border-amber-400/25 bg-zinc-950 p-6 shadow-2xl">
            <h3 id="pro-modal-title" className="text-lg font-extrabold text-zinc-50">
              FIFER Pro
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Acelera tus resultados con FIFER Pro. Accede a las IA más potentes del mercado.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProModalOpen(false)}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
