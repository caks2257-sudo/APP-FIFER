/**
 * Toolkit de IA — lista maestro 2026 (FIFER).
 * Variables: insertar solo API keys en `.env.local` (ver `envKeys` por proveedor).
 */

export type AiToolkitCategory = "dual_brain" | "visual" | "multimedia_pro";

export interface AiToolkitProvider {
  id: string;
  label: string;
  category: AiToolkitCategory;
  /** Modelo por defecto sugerido (sobrescribible con env `…_MODEL`). */
  defaultModel: string;
  /** Variables de entorno a definir (primera = principal). */
  envKeys: readonly string[];
  /** Endpoint base público documentado (proxy en `src/app/api/ai/...`). */
  upstreamBaseUrl: string;
  /** Ruta interna Next (App Router). */
  fiferRoute: string;
  notes: string;
}

/** Catálogo estable — nombres de modelo alineables con `*_MODEL` en runtime. */
export const AI_TOOLKIT_PROVIDERS: readonly AiToolkitProvider[] = [
  {
    id: "openai_chat",
    label: "OpenAI · GPT (motor principal)",
    category: "dual_brain",
    defaultModel: "gpt-4o",
    envKeys: ["FIFER_OPENAI_API_KEY", "OPENAI_API_KEY"] as const,
    upstreamBaseUrl: "https://api.openai.com/v1",
    fiferRoute: "/api/ai/openai/chat",
    notes:
      "Ejecución de tareas complejas, análisis financiero Chicureo y lógica de negocio. Opcional: FIFER_OPENAI_MODEL=gpt-4o (o el que exponga tu cuenta).",
  },
  {
    id: "gemini_refine",
    label: "Google Gemini Flash · refinamiento de prompts",
    category: "dual_brain",
    defaultModel: "gemini-2.0-flash",
    envKeys: ["FIFER_GEMINI_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"] as const,
    upstreamBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    fiferRoute: "/api/ai/gemini/refine",
    notes:
      "Etapa isRefining (Dual-Stage): velocidad y ventana amplia. Cuando Google publique “3.1 Flash”, asignar FIFER_GEMINI_REFINE_MODEL.",
  },
  {
    id: "anthropic_editorial",
    label: "Anthropic Claude · editorial / código",
    category: "dual_brain",
    defaultModel: "claude-sonnet-4-20250514",
    envKeys: ["FIFER_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY"] as const,
    upstreamBaseUrl: "https://api.anthropic.com/v1",
    fiferRoute: "/api/ai/anthropic/messages",
    notes:
      "Redacción editorial técnica y codegen para módulo contenido. Ajustar FIFER_ANTHROPIC_MODEL al slug Opus/Sonnet que entregue tu cuenta.",
  },
  {
    id: "leonardo_visual",
    label: "Leonardo.ai · renders / texturas ABKupfer",
    category: "visual",
    defaultModel: "leonardo-default",
    envKeys: ["FIFER_LEONARDO_API_KEY", "LEONARDO_API_KEY"] as const,
    upstreamBaseUrl: "https://cloud.leonardo.ai/api/rest/v1",
    fiferRoute: "/api/ai/leonardo/generations",
    notes: "Prioridad 1 visual: arquitectura, madera, acabados inmobiliarios. Body según docs Leonardo REST.",
  },
  {
    id: "openai_dalle",
    label: "OpenAI · DALL·E 3 (texto en imagen)",
    category: "visual",
    defaultModel: "dall-e-3",
    envKeys: ["FIFER_OPENAI_API_KEY", "OPENAI_API_KEY"] as const,
    upstreamBaseUrl: "https://api.openai.com/v1",
    fiferRoute: "/api/ai/openai/images",
    notes: "Infografías y layouts con texto legible. Misma clave que OpenAI chat.",
  },
  {
    id: "adobe_firefly",
    label: "Adobe Firefly Services",
    category: "visual",
    defaultModel: "firefly-services",
    envKeys: ["FIFER_ADOBE_CLIENT_ID", "FIFER_ADOBE_CLIENT_SECRET", "FIFER_ADOBE_ACCESS_TOKEN"] as const,
    upstreamBaseUrl: "https://firefly-api.adobe.io",
    fiferRoute: "/api/ai/adobe/firefly",
    notes:
      "Relleno generativo y edición avanzada sobre fotos reales. Requiere flujo OAuth / token IMS de Adobe — stub cableado hasta credenciales.",
  },
  {
    id: "elevenlabs_voice",
    label: "ElevenLabs · voz oficial FIFER",
    category: "multimedia_pro",
    defaultModel: "eleven_multilingual_v2",
    envKeys: ["FIFER_ELEVENLABS_API_KEY", "ELEVENLABS_API_KEY"] as const,
    upstreamBaseUrl: "https://api.elevenlabs.io/v1",
    fiferRoute: "/api/ai/elevenlabs/text-to-speech",
    notes:
      "Narración mini-series, feedback por voz en modo Live. Opcional: FIFER_ELEVENLABS_VOICE_ID y FIFER_ELEVENLABS_MODEL_ID.",
  },
  {
    id: "runway_gen3",
    label: "Runway · Gen-3 Alpha (foto → video)",
    category: "multimedia_pro",
    defaultModel: "gen-3-alpha",
    envKeys: ["FIFER_RUNWAY_API_KEY"] as const,
    upstreamBaseUrl: "https://api.runwayml.com/v1",
    fiferRoute: "/api/ai/runway/generate",
    notes:
      "Revestimientos madera → clips cinemáticos. Ajusta FIFER_RUNWAY_API_BASE_URL + FIFER_RUNWAY_GENERATE_PATH según la doc vigente de Runway (endpoints evolucionan).",
  },
  {
    id: "heygen_avatar",
    label: "HeyGen · Arquitecto Virtual (avatar video)",
    category: "multimedia_pro",
    defaultModel: "heygen-avatar",
    envKeys: ["FIFER_HEYGEN_API_KEY"] as const,
    upstreamBaseUrl: "https://api.heygen.com",
    fiferRoute: "/api/ai/heygen/video",
    notes:
      "Avatar explicando estados de proyecto a clientes. Body alineado a la API HeyGen (plantillas / avatares) — proxy transparente.",
  },
  {
    id: "openai_whisper",
    label: "OpenAI Whisper · transcripción órdenes voz",
    category: "multimedia_pro",
    defaultModel: "whisper-1",
    envKeys: ["FIFER_OPENAI_API_KEY", "OPENAI_API_KEY"] as const,
    upstreamBaseUrl: "https://api.openai.com/v1",
    fiferRoute: "/api/ai/openai/transcriptions",
    notes:
      "Transcripción precisa de dictados / comandos en dashboard. multipart/form-data (file + model whisper-1 + language opcional).",
  },
] as const;

export type AiToolkitProviderId = (typeof AI_TOOLKIT_PROVIDERS)[number]["id"];

export function providerById(id: string): AiToolkitProvider | undefined {
  return AI_TOOLKIT_PROVIDERS.find((p) => p.id === id);
}
