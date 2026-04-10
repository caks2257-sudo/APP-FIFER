import { AI_TOOLKIT_PROVIDERS, type AiToolkitProvider } from "@/config/ai-toolkit";

function firstDefinedEnv(keys: readonly string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim().length > 0) return k;
  }
  return undefined;
}

export type ProviderReadiness = {
  id: string;
  configured: boolean;
  /** Si está configurado, qué variable resolvió (solo nombre, nunca el valor). */
  resolvedEnvKey?: string;
};

export function getAiToolkitReadiness(): ProviderReadiness[] {
  return AI_TOOLKIT_PROVIDERS.map((p: AiToolkitProvider) => {
    const resolved = firstDefinedEnv(p.envKeys);
    return {
      id: p.id,
      configured: Boolean(resolved),
      resolvedEnvKey: resolved,
    };
  });
}

export function resolveOpenAiKey(): string | null {
  const v = process.env.FIFER_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function resolveGeminiKey(): string | null {
  const v =
    process.env.FIFER_GEMINI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function resolveAnthropicKey(): string | null {
  const v = process.env.FIFER_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function resolveLeonardoKey(): string | null {
  const v = process.env.FIFER_LEONARDO_API_KEY ?? process.env.LEONARDO_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Adobe: mínimo token bearer para llamadas Firefly (cuando completes OAuth). */
export function resolveAdobeFireflyToken(): string | null {
  const v = process.env.FIFER_ADOBE_ACCESS_TOKEN;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function resolveElevenLabsKey(): string | null {
  const v = process.env.FIFER_ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function resolveRunwayKey(): string | null {
  const v = process.env.FIFER_RUNWAY_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function resolveHeyGenKey(): string | null {
  const v = process.env.FIFER_HEYGEN_API_KEY;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
