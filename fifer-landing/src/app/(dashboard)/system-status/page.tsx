"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  fetchApiHealthStatus,
  refreshApiHealthMonitor,
  type ApiHealthStatusRow,
} from "@/lib/fifer-api";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";

const DEEP_NAVY = "#0A0F1E";
const NEON_GREEN = "#4ade80";
const NEON_GREEN_BORDER = "#22c55e";
const RED_VIBRANT = "#f87171";
const RED_BG = "rgba(127, 29, 29, 0.45)";
const GREY_BADGE = "#52525b";
const OFFLINE_DIAGNOSTIC = "#fecaca";
const OFFLINE_ROW_TINT = "rgba(69, 10, 10, 0.35)";

type ServiceTier =
  | "general_llm"
  | "premium"
  | "embeddings_vector"
  | "image_generation_open"
  | "image_generation_premium"
  | "video_generation_open"
  | "video_generation_premium"
  | "voice_speech";

/** Nombres canónicos del monitor (`api_health_monitor.js`). */
const PROVIDER_SERVICE_TIER: Record<string, ServiceTier> = {
  /* Motores generales / OSS (LLM & agregadores) */
  "Hugging Face": "general_llm",
  OpenRouter: "general_llm",
  Groq: "general_llm",
  "Together AI": "general_llm",
  Replicate: "general_llm",
  fal: "general_llm",
  "Fireworks AI": "general_llm",
  DeepSeek: "general_llm",
  /* Embeddings / RAG (listado modelos o probe vectorial) */
  Cohere: "embeddings_vector",
  "Voyage AI": "embeddings_vector",
  /* Imagen — open / agregadores abiertos */
  "Stability AI": "image_generation_open",
  "Hugging Face Diffusers": "image_generation_open",
  "fal (image)": "image_generation_open",
  "Replicate (image)": "image_generation_open",
  "Together AI (image)": "image_generation_open",
  /* Imagen — premium / creative de pago */
  "OpenAI Images": "image_generation_premium",
  "Google Imagen": "image_generation_premium",
  "Adobe Firefly": "image_generation_premium",
  "Leonardo AI": "image_generation_premium",
  Ideogram: "image_generation_premium",
  /* Video — open */
  "fal (video)": "video_generation_open",
  "Replicate (video)": "video_generation_open",
  "Hugging Face (video)": "video_generation_open",
  /* Video — premium */
  Runway: "video_generation_premium",
  Luma: "video_generation_premium",
  Pika: "video_generation_premium",
  Kling: "video_generation_premium",
  "Google Veo": "video_generation_premium",
  /* Premium / propietarias */
  OpenAI: "premium",
  Anthropic: "premium",
  "Google Gemini": "premium",
  xAI: "premium",
  "AWS Bedrock": "premium",
  "Azure OpenAI": "premium",
  /* Voz / transcripción (TTS + STT) */
  ElevenLabs: "voice_speech",
  Deepgram: "voice_speech",
  AssemblyAI: "voice_speech",
  PlayHT: "voice_speech",
};

/** Slugs alternativos (APIs, futuros renames). */
const PROVIDER_TIER_ALIASES: Record<string, ServiceTier> = {
  huggingface: "general_llm",
  hugging_face: "general_llm",
  openrouter: "general_llm",
  groq: "general_llm",
  together: "general_llm",
  together_ai: "general_llm",
  replicate: "general_llm",
  fal: "general_llm",
  fireworks: "general_llm",
  fireworks_ai: "general_llm",
  deepseek: "general_llm",
  stability: "image_generation_open",
  stability_ai: "image_generation_open",
  hf_diffusers: "image_generation_open",
  hugging_face_diffusers: "image_generation_open",
  fal_image: "image_generation_open",
  replicate_image: "image_generation_open",
  together_image: "image_generation_open",
  together_ai_image: "image_generation_open",
  openai_images: "image_generation_premium",
  google_imagen: "image_generation_premium",
  adobe_firefly: "image_generation_premium",
  leonardo: "image_generation_premium",
  leonardo_ai: "image_generation_premium",
  ideogram: "image_generation_premium",
  fal_video: "video_generation_open",
  replicate_video: "video_generation_open",
  hf_video: "video_generation_open",
  hugging_face_video: "video_generation_open",
  runway: "video_generation_premium",
  luma: "video_generation_premium",
  pika: "video_generation_premium",
  kling: "video_generation_premium",
  google_veo: "video_generation_premium",
  veo: "video_generation_premium",
  cohere: "embeddings_vector",
  voyage: "embeddings_vector",
  voyage_ai: "embeddings_vector",
  voyageai: "embeddings_vector",
  elevenlabs: "voice_speech",
  deepgram: "voice_speech",
  assemblyai: "voice_speech",
  assembly_ai: "voice_speech",
  playht: "voice_speech",
  play_ht: "voice_speech",
};

function slugifyProviderName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function tierForProvider(providerName: string): ServiceTier {
  const canonical = PROVIDER_SERVICE_TIER[providerName];
  if (canonical) return canonical;
  const slug = slugifyProviderName(providerName);
  return PROVIDER_TIER_ALIASES[slug] ?? "general_llm";
}

function isImageLatencyTier(tier: ServiceTier): boolean {
  return tier === "image_generation_open" || tier === "image_generation_premium";
}

function isVideoLatencyTier(tier: ServiceTier): boolean {
  return tier === "video_generation_open" || tier === "video_generation_premium";
}

function isVoiceLatencyTier(tier: ServiceTier): boolean {
  return tier === "voice_speech";
}

function StatusBadge({ status, lastError }: { status: string; lastError: string | null }) {
  const s = status.toLowerCase();
  let style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: "0.5rem",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    border: "1px solid",
  };
  const label = status;

  if (s === "online") {
    style = {
      ...style,
      color: NEON_GREEN,
      borderColor: NEON_GREEN_BORDER,
      background: "rgba(34, 197, 94, 0.12)",
      boxShadow: `0 0 12px rgba(34, 197, 94, 0.25)`,
    };
  } else if (s === "degraded") {
    style = {
      ...style,
      color: "#111",
      borderColor: FIFER_ELECTRIC_YELLOW,
      background: FIFER_ELECTRIC_YELLOW,
    };
  } else if (s === "offline") {
    style = {
      ...style,
      color: RED_VIBRANT,
      borderColor: "#ef4444",
      background: RED_BG,
    };
  } else if (s === "unconfigured") {
    style = {
      ...style,
      color: "#a1a1aa",
      borderColor: GREY_BADGE,
      background: "rgba(63, 63, 70, 0.35)",
    };
  } else {
    style = {
      ...style,
      color: "#cbd5e1",
      borderColor: "#475569",
      background: "#1e293b",
    };
  }

  return (
    <span style={style}>
      {label}
      {s === "offline" && lastError ? (
        <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, fontSize: 11, color: OFFLINE_DIAGNOSTIC }}>
          — {lastError}
        </span>
      ) : null}
    </span>
  );
}

function formatCheckedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return "—";
  }
}

function diagnosticCell(r: ApiHealthStatusRow): ReactNode {
  const s = r.status.toLowerCase();
  const tier = tierForProvider(r.provider_name);
  const imageTier = isImageLatencyTier(tier);
  const videoTier = isVideoLatencyTier(tier);
  const voiceTier = isVoiceLatencyTier(tier);
  if (s === "offline") {
    return (
      <span
        style={{
          color: OFFLINE_DIAGNOSTIC,
          fontWeight: 700,
          fontSize: 13,
          lineHeight: 1.45,
          wordBreak: "break-word",
          display: "block",
          textShadow: "0 0 18px rgba(248, 113, 113, 0.45)",
        }}
      >
        {r.last_error || "—"}
      </span>
    );
  }
  if (s === "unconfigured") {
    if (r.last_error && r.last_error !== "Missing API Key" && r.last_error !== "Falta Auth Key") {
      return <span className="text-zinc-400">{r.last_error}</span>;
    }
    if (r.last_error === "Falta Auth Key" || (isVoiceLatencyTier(tier) && r.last_error === "Missing API Key")) {
      return <span className="text-zinc-400">Falta Auth Key — configura variables en el motor (ElevenLabs, Deepgram, AssemblyAI, PlayHT + user id).</span>;
    }
    const enterprise = r.provider_name === "AWS Bedrock" || r.provider_name === "Azure OpenAI";
    return (
      <span>
        {enterprise
          ? "Configura región/IAM (Bedrock) o endpoint corporativo + api-key (Azure) en el motor."
          : "Añade la API key en `.env` del motor (véase `.env.example`)."}
      </span>
    );
  }
  if (s === "degraded") {
    if (r.last_error) {
      return <span style={{ color: "#fde047" }}>{r.last_error}</span>;
    }
    return (
      <span>
        {videoTier
          ? "Latencia &gt; 5s (umbral video); conexión operativa con rendimiento reducido."
          : imageTier
            ? "Latencia &gt; 4s (umbral imagen); conexión operativa con rendimiento reducido."
            : voiceTier
              ? "Latencia &gt; 3s (umbral voz); conexión operativa con rendimiento reducido."
              : "Latencia &gt; 2s; conexión operativa con rendimiento reducido."}
      </span>
    );
  }
  return <span style={{ color: "#86efac" }}>OK</span>;
}

const TABLE_HEADERS = ["Proveedor", "Estado", "Latencia (ms)", "Última verificación", "Diagnóstico"] as const;

function MonitoringTable({
  sectionIcon,
  sectionTitle,
  sectionSubtitle,
  rows,
  loading,
  emptyHint,
  headingLevel = "h2",
  dense = false,
}: {
  sectionIcon?: string;
  sectionTitle: string;
  sectionSubtitle: string;
  rows: ApiHealthStatusRow[];
  loading: boolean;
  emptyHint: string;
  /** Subtablas dentro de un bloque padre (p. ej. Motores de Imagen). */
  headingLevel?: "h2" | "h3";
  /** Menos padding vertical para cuadrantes bento (menos scroll). */
  dense?: boolean;
}) {
  const HeadingTag = headingLevel;
  const cellY = dense ? "py-2" : "py-3.5";
  const cellX = dense ? "px-3" : "px-4";
  const headY = dense ? "py-2.5" : "py-3.5";
  const tableText = dense ? "text-[12px]" : "text-[13px]";
  const emptyY = dense ? "py-5" : "py-8";
  return (
    <section className="min-w-0">
      <div className={dense ? "mb-2" : "mb-3"}>
        <HeadingTag
          className={
            headingLevel === "h2"
              ? "m-0 flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight text-zinc-50"
              : `m-0 flex items-center gap-2 font-bold tracking-tight text-zinc-100 ${dense ? "text-[12px]" : "text-[13px]"}`
          }
          style={{ letterSpacing: "-0.01em" }}
        >
          {sectionIcon ? (
            <span aria-hidden="true" className={headingLevel === "h2" ? "text-lg leading-none" : "text-base leading-none"}>
              {sectionIcon}
            </span>
          ) : null}
          <span>{sectionTitle}</span>
        </HeadingTag>
        <p className={`max-w-none leading-snug text-slate-400 ${dense ? "mt-1 text-[10px]" : "mt-1.5 text-xs"}`}>
          {sectionSubtitle}
        </p>
      </div>
      <div
        className="overflow-hidden rounded-xl border border-amber-400/20 bg-fifer-card/95 shadow-2xl"
        style={{
          boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
        }}
      >
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse ${tableText}`}>
            <thead>
              <tr className="text-left" style={{ background: "rgba(234, 179, 8, 0.08)" }}>
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className={`${cellX} ${headY} font-bold uppercase tracking-wider ${dense ? "text-[9px]" : "text-[11px]"}`}
                    style={{
                      color: FIFER_ELECTRIC_YELLOW,
                      borderBottom: `1px solid ${FIFER_ELECTRIC_YELLOW}33`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${cellX} ${emptyY} text-center text-slate-500`}>
                    Cargando monitor…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${cellX} ${emptyY} text-center text-slate-500`}>
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const offline = r.status.toLowerCase() === "offline";
                  return (
                    <tr
                      key={r.provider_name}
                      className="border-b border-slate-500/15"
                      style={{
                        background: offline ? OFFLINE_ROW_TINT : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                        borderLeft: offline ? "3px solid #ef4444" : undefined,
                      }}
                    >
                      <td className={`${cellX} ${cellY} font-bold text-slate-50`}>{r.provider_name}</td>
                      <td className={`${cellX} ${cellY} align-top`}>
                        <StatusBadge status={r.status} lastError={offline ? r.last_error : null} />
                      </td>
                      <td
                        className={`${cellX} ${cellY} font-mono tabular-nums`}
                        style={{
                          color: r.latency_ms != null ? "#e2e8f0" : "#64748b",
                          fontWeight: r.latency_ms != null ? 700 : 400,
                        }}
                        title="Latencia del último ping (actualizada con el refresco automático o manual)"
                      >
                        {r.latency_ms != null ? `${r.latency_ms} ms` : "—"}
                      </td>
                      <td className={`${cellX} ${cellY} font-mono text-slate-300 ${dense ? "text-[10px]" : "text-xs"}`}>
                        {formatCheckedAt(r.last_checked_at)}
                      </td>
                      <td
                        className={`max-w-[min(200px,35vw)] ${cellX} ${cellY} text-slate-400 ${dense ? "text-[10px]" : "text-xs"}`}
                        style={
                          offline
                            ? {
                                background: "rgba(127, 29, 29, 0.2)",
                                borderRadius: "0 0.5rem 0.5rem 0",
                              }
                            : undefined
                        }
                      >
                        {diagnosticCell(r)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function BentoQuadrant({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col rounded-2xl border border-amber-400/18 bg-fifer-card/55 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm lg:p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export default function SystemStatusPage() {
  const [rows, setRows] = useState<ApiHealthStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchApiHealthStatus();
    if (!res.success) {
      setError(res.error || "No se pudo cargar el estado");
      setRows([]);
      return;
    }
    setError(null);
    setRows(Array.isArray(res.data) ? res.data : []);
  }, []);

  const {
    generalLlmRows,
    embeddingsVectorRows,
    imageOpenRows,
    imagePremiumRows,
    videoOpenRows,
    videoPremiumRows,
    premiumRows,
    voiceRows,
  } = useMemo(() => {
    const general: ApiHealthStatusRow[] = [];
    const embeddings: ApiHealthStatusRow[] = [];
    const imageOpen: ApiHealthStatusRow[] = [];
    const imagePremium: ApiHealthStatusRow[] = [];
    const videoOpen: ApiHealthStatusRow[] = [];
    const videoPremium: ApiHealthStatusRow[] = [];
    const premium: ApiHealthStatusRow[] = [];
    const voice: ApiHealthStatusRow[] = [];
    for (const r of rows) {
      const t = tierForProvider(r.provider_name);
      if (t === "premium") premium.push(r);
      else if (t === "embeddings_vector") embeddings.push(r);
      else if (t === "voice_speech") voice.push(r);
      else if (t === "image_generation_open") imageOpen.push(r);
      else if (t === "image_generation_premium") imagePremium.push(r);
      else if (t === "video_generation_open") videoOpen.push(r);
      else if (t === "video_generation_premium") videoPremium.push(r);
      else general.push(r);
    }
    const byName = (a: ApiHealthStatusRow, b: ApiHealthStatusRow) => a.provider_name.localeCompare(b.provider_name);
    general.sort(byName);
    embeddings.sort(byName);
    imageOpen.sort(byName);
    imagePremium.sort(byName);
    videoOpen.sort(byName);
    videoPremium.sort(byName);
    premium.sort(byName);
    voice.sort(byName);
    return {
      generalLlmRows: general,
      embeddingsVectorRows: embeddings,
      imageOpenRows: imageOpen,
      imagePremiumRows: imagePremium,
      videoOpenRows: videoOpen,
      videoPremiumRows: videoPremium,
      premiumRows: premium,
      voiceRows: voice,
    };
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function forceDiagnostic() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await refreshApiHealthMonitor();
      if (!res.success) {
        setError(res.error || "Diagnóstico fallido");
        await load();
        return;
      }
      const providers = res.data?.providers;
      if (Array.isArray(providers) && providers.length) {
        setRows(providers);
      } else {
        await load();
      }
    } finally {
      setRefreshing(false);
    }
  }

  const emptyGlobal = !loading && rows.length === 0;

  const uptime = useMemo(() => {
    let online = 0;
    let offline = 0;
    let degraded = 0;
    let unconfigured = 0;
    for (const r of rows) {
      const st = String(r.status || "").toLowerCase();
      if (st === "online") online += 1;
      else if (st === "offline") offline += 1;
      else if (st === "degraded") degraded += 1;
      else if (st === "unconfigured") unconfigured += 1;
    }
    const denom = online + offline;
    const pct = denom > 0 ? Math.round((100 * online) / denom) : null;
    return { online, offline, degraded, unconfigured, pct, total: rows.length };
  }, [rows]);

  const uptimeDotClass =
    uptime.pct === null
      ? "bg-zinc-500"
      : uptime.pct >= 90
        ? "bg-emerald-400"
        : uptime.pct >= 70
          ? "bg-amber-400"
          : "bg-red-500";

  return (
    <main
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, ${DEEP_NAVY} 0%, #050810 100%)`,
        color: "#e4e4e7",
        padding: "24px 28px 48px",
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
          borderBottom: `1px solid ${FIFER_ELECTRIC_YELLOW}33`,
          paddingBottom: 16,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: FIFER_ELECTRIC_YELLOW,
              fontWeight: 700,
              margin: "0 0 6px 0",
            }}
          >
            DevOps Command Center
          </p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.02em" }}>
            Estado del sistema
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#94a3b8", maxWidth: 720 }}>
            Bento 2×2 + voz: generales, premium LLM, imagen, video y fila inferior de TTS/STT. Umbrales degradados 2s / 3s
            (voz) / 4s / 5s. <span style={{ color: OFFLINE_DIAGNOSTIC }}>Offline</span> resaltado en tablas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void forceDiagnostic()}
          disabled={refreshing || loading}
          style={{
            padding: "10px 18px",
            borderRadius: "0.75rem",
            border: `1px solid ${FIFER_ELECTRIC_YELLOW}`,
            background: refreshing ? "rgba(234, 179, 8, 0.15)" : "rgba(234, 179, 8, 0.22)",
            color: "#fef9c3",
            fontSize: 13,
            fontWeight: 700,
            cursor: refreshing || loading ? "wait" : "pointer",
            boxShadow: `0 0 20px rgba(234, 179, 8, 0.15)`,
          }}
        >
          {refreshing ? "Ejecutando pings…" : "Forzar diagnóstico"}
        </button>
      </header>

      <div
        className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-400/22 bg-slate-900/55 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="relative mt-0.5 flex h-3 w-3 shrink-0">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-35 ${uptimeDotClass}`}
            />
            <span className={`relative inline-flex h-3 w-3 rounded-full ${uptimeDotClass}`} />
          </span>
          <div>
            <p className="m-0 text-[15px] font-extrabold tracking-tight text-zinc-50">
              {uptime.total === 0 && !loading
                ? "Sin lecturas del monitor"
                : uptime.pct !== null
                  ? `Sistema ${uptime.pct}% operativo`
                  : "Sistema operativo (sin par online/offline en último ciclo)"}
            </p>
            <p className="m-0 text-[11px] leading-snug text-slate-400">
              {uptime.online} online · {uptime.offline} offline · {uptime.degraded} degradados · {uptime.unconfigured}{" "}
              sin configurar
              {uptime.pct !== null ? (
                <span className="text-slate-500"> · ratio online/(online+offline)</span>
              ) : null}
            </p>
          </div>
        </div>
        {loading ? <span className="text-xs text-slate-500">Actualizando…</span> : null}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: "0.75rem",
            border: "1px solid #b91c1c",
            background: "rgba(69, 10, 10, 0.5)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {/*
        Bento 2×2 (lg+) + fila inferior centrada (voz):
        [ Generales ] [ Premium LLM ]
        [ Imagen     ] [ Video 🎬    ]
        [ ——— Motores de Voz y Transcripción 🎙️ ——— ]
      */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-2 lg:gap-4 lg:items-stretch">
        <BentoQuadrant>
          <div className="mb-2 border-b border-amber-400/15 pb-2">
            <h2 className="m-0 flex items-center gap-2 text-[14px] font-extrabold tracking-tight text-zinc-50">
              <span aria-hidden="true" className="text-base leading-none">
                📝
              </span>
              <span>APIs generales y agregadores</span>
            </h2>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">
              LLM open + DeepSeek. Embeddings / vectorial en bloque inferior con etiqueta dedicada.
            </p>
          </div>
          <div className="flex min-h-0 flex-col gap-4">
            <MonitoringTable
              headingLevel="h3"
              sectionTitle="LLM y open stack"
              sectionSubtitle="Hugging Face, OpenRouter, Groq, Together, Replicate, fal, Fireworks, DeepSeek."
              rows={generalLlmRows}
              loading={loading}
              dense
              emptyHint={
                emptyGlobal
                  ? "Sin registros. Migración `api_health_status` + ciclo del monitor."
                  : "Ningún proveedor en esta flota."
              }
            />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-950/50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-cyan-100/95 shadow-[0_0_16px_rgba(34,211,238,0.12)]"
                title="RAG, memoria semántica, rerank"
              >
                Embeddings / vectorial
              </span>
              <span className="text-[10px] text-slate-500">Cohere (catálogo) · Voyage AI (probe embeddings)</span>
            </div>
            <MonitoringTable
              headingLevel="h3"
              sectionIcon="🔮"
              sectionTitle="Motores de embedding"
              sectionSubtitle="Salud de APIs usadas para vectores y búsqueda semántica (umbrales 2s como LLM general)."
              rows={embeddingsVectorRows}
              loading={loading}
              dense
              emptyHint={
                emptyGlobal
                  ? "Sin registros."
                  : "Ningún proveedor embeddings en esta flota."
              }
            />
          </div>
        </BentoQuadrant>

        <BentoQuadrant>
          <MonitoringTable
            sectionIcon="💎"
            sectionTitle="APIs premium (LLM enterprise)"
            sectionSubtitle="OpenAI, Anthropic, Gemini, xAI, Bedrock, Azure. (Cohere → bloque embeddings.)"
            rows={premiumRows}
            loading={loading}
            dense
            emptyHint={
              emptyGlobal
                ? "Sin registros. Migración `api_health_status` + ciclo del monitor."
                : "Ningún proveedor en esta flota."
            }
          />
        </BentoQuadrant>

        <BentoQuadrant>
          <div className="mb-2 border-b border-amber-400/15 pb-2">
            <h2 className="m-0 flex items-center gap-2 text-[14px] font-extrabold tracking-tight text-zinc-50">
              <span aria-hidden="true" className="text-base leading-none">
                🎨
              </span>
              <span>Motores de imagen</span>
            </h2>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">Open + premium en un solo cuadrante.</p>
          </div>
          <div className="flex min-h-0 flex-col gap-4">
            <MonitoringTable
              headingLevel="h3"
              sectionTitle="Open source"
              sectionSubtitle="Stability, HF Diffusers, fal/Replicate/Together (image)."
              rows={imageOpenRows}
              loading={loading}
              dense
              emptyHint={
                emptyGlobal
                  ? "Sin registros."
                  : "Ningún proveedor open image."
              }
            />
            <MonitoringTable
              headingLevel="h3"
              sectionTitle="Premium"
              sectionSubtitle="OpenAI Images, Imagen, Firefly, Leonardo, Ideogram."
              rows={imagePremiumRows}
              loading={loading}
              dense
              emptyHint={
                emptyGlobal
                  ? "Sin registros."
                  : "Ningún proveedor premium image."
              }
            />
          </div>
        </BentoQuadrant>

        <BentoQuadrant>
          <div className="mb-2 border-b border-amber-400/15 pb-2">
            <h2 className="m-0 flex items-center gap-2 text-[14px] font-extrabold tracking-tight text-zinc-50">
              <span aria-hidden="true" className="text-base leading-none">
                🎬
              </span>
              <span>Motores de video</span>
            </h2>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">
              Open: fal_video, replicate_video, hf_video · Premium: Runway, Luma, Pika, Kling, Veo.
            </p>
          </div>
          <div className="flex min-h-0 flex-col gap-4">
            <MonitoringTable
              headingLevel="h3"
              sectionTitle="Open source"
              sectionSubtitle="fal (video), Replicate (video), Hugging Face (video)."
              rows={videoOpenRows}
              loading={loading}
              dense
              emptyHint={
                emptyGlobal
                  ? "Sin registros."
                  : "Ningún proveedor open video."
              }
            />
            <MonitoringTable
              headingLevel="h3"
              sectionTitle="Premium"
              sectionSubtitle="Runway, Luma, Google Veo; Pika/Kling enterprise."
              rows={videoPremiumRows}
              loading={loading}
              dense
              emptyHint={
                emptyGlobal
                  ? "Sin registros."
                  : "Ningún proveedor premium video."
              }
            />
          </div>
        </BentoQuadrant>
        </div>

        <BentoQuadrant className="mx-auto w-full max-w-5xl lg:max-w-6xl">
          <MonitoringTable
            sectionIcon="🎙️"
            sectionTitle="Motores de voz y transcripción"
            sectionSubtitle="ElevenLabs (TTS), Deepgram & AssemblyAI (STT), PlayHT (TTS). Umbrales de degradación 3s en listados ligeros."
            rows={voiceRows}
            loading={loading}
            dense
            emptyHint={
              emptyGlobal
                ? "Sin registros. Migración `api_health_status` + ciclo del monitor."
                : "Ningún proveedor en esta flota (voice_speech)."
            }
          />
        </BentoQuadrant>
      </div>
    </main>
  );
}
