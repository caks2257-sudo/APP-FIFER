/**
 * Motor `ai-fallback-cascade` — Micro-Core FIFER (Constitución v6.0)
 * Enrutador FinOps: cascada depende de `core.tier` (free vs pro).
 */

import { EngineRegistry } from "@/registry/engine-registry";
import type { CoreProfile } from "@/types/user-dna";

import "./sub-engines/image-gen";
import "./sub-engines/comms";

const ENGINE_ID = "ai-fallback-cascade" as const;

const LOG_PREFIX = `[FIFER Engine ${ENGINE_ID}]`;

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const OPENAI_PREMIUM_MODEL_DEFAULT = "gpt-4o";
const OPENAI_FREE_MODEL = "gpt-4o-mini";

function resolveOpenAiPremiumModel(): string {
  return (
    process.env.FIFER_OPENAI_FALLBACK_MODEL?.trim() ||
    process.env.FIFER_OPENAI_MODEL?.trim() ||
    OPENAI_PREMIUM_MODEL_DEFAULT
  );
}

export type CascadeInsightResult =
  | { ok: true; finalOutput: string }
  | { ok: false; reason: string };

export type ProcessInsightOptions = {
  meta?: { moduleId: string; boxId: string };
};

export type CascadeTierFailure = {
  tier: number;
  provider: string;
  detail: string;
};

export class AiCascadeExhaustedError extends Error {
  readonly code = "AI_CASCADE_EXHAUSTED" as const;
  readonly tierErrors: ReadonlyArray<CascadeTierFailure>;

  constructor(message: string, tierErrors: ReadonlyArray<CascadeTierFailure>) {
    super(message);
    this.name = "AiCascadeExhaustedError";
    this.tierErrors = tierErrors;
  }
}

function logCascadeFailure(provider: string, detail: string): void {
  console.error(`${LOG_PREFIX} fallo en proveedor '${provider}':`, detail);
}

function metaSuffix(options?: ProcessInsightOptions): string {
  return options?.meta
    ? `\n\n[meta: moduleId=${options.meta.moduleId}, boxId=${options.meta.boxId}]`
    : "";
}

async function openaiChat(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<CascadeInsightResult> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    if (res.status === 401) {
      return { ok: false, reason: "Credenciales de IA inválidas (OpenAI)." };
    }
    if (res.status === 402 || res.status === 429) {
      return {
        ok: false,
        reason: "Saldo insuficiente o límite de uso excedido (OpenAI).",
      };
    }
    return {
      ok: false,
      reason: raw.trim() || `Error del proveedor OpenAI (${res.status}).`,
    };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { ok: false, reason: "Respuesta vacía del proveedor OpenAI." };
  }
  return { ok: true, finalOutput: text };
}

async function openaiDualStage(
  apiKey: string,
  model: string,
  userInstruction: string,
  options?: ProcessInsightOptions
): Promise<CascadeInsightResult> {
  const suffix = metaSuffix(options);
  const stage1 = await openaiChat(
    apiKey,
    model,
    "Eres ingeniero de prompts. Devuelve ÚNICAMENTE el prompt refinado para un analista estratégico, en español, sin preámbulos ni comillas.",
    `Refina este brief para análisis estratégico:${suffix}\n\n---\n${userInstruction}\n---`
  );
  if (!stage1.ok) return stage1;
  return openaiChat(
    apiKey,
    model,
    "Eres director de estrategia FIFER. Entregas insights accionables en español, claros y profesionales.",
    stage1.finalOutput
  );
}

function geminiApiKey(): string | undefined {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return k || undefined;
}

async function geminiGenerate(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<CascadeInsightResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        role: "system",
        parts: [{ text: system }],
      },
      contents: [{ role: "user", parts: [{ text: user }] }],
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    return {
      ok: false,
      reason: raw.trim() || `Error del proveedor Gemini (${res.status}).`,
    };
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    return { ok: false, reason: "Respuesta vacía o bloqueada (Gemini)." };
  }
  return { ok: true, finalOutput: text };
}

async function geminiDualStage(
  apiKey: string,
  model: string,
  userInstruction: string,
  options?: ProcessInsightOptions
): Promise<CascadeInsightResult> {
  const suffix = metaSuffix(options);
  const stage1 = await geminiGenerate(
    apiKey,
    model,
    "Eres ingeniero de prompts. Devuelve ÚNICAMENTE el prompt refinado para un analista estratégico, en español, sin preámbulos ni comillas.",
    `Refina este brief para análisis estratégico:${suffix}\n\n---\n${userInstruction}\n---`
  );
  if (!stage1.ok) return stage1;
  return geminiGenerate(
    apiKey,
    model,
    "Eres director de estrategia FIFER. Entregas insights accionables en español, claros y profesionales.",
    stage1.finalOutput
  );
}

async function anthropicMessage(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<CascadeInsightResult> {
  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    return {
      ok: false,
      reason: raw.trim() || `Error del proveedor Anthropic (${res.status}).`,
    };
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const block = data.content?.find((c) => c.type === "text");
  const text = block?.text?.trim();
  if (!text) {
    return { ok: false, reason: "Respuesta vacía del proveedor Anthropic." };
  }
  return { ok: true, finalOutput: text };
}

async function anthropicDualStage(
  apiKey: string,
  model: string,
  userInstruction: string,
  options?: ProcessInsightOptions
): Promise<CascadeInsightResult> {
  const suffix = metaSuffix(options);
  const stage1 = await anthropicMessage(
    apiKey,
    model,
    "Eres ingeniero de prompts. Devuelve ÚNICAMENTE el prompt refinado para un analista estratégico, en español, sin preámbulos ni comillas.",
    `Refina este brief para análisis estratégico:${suffix}\n\n---\n${userInstruction}\n---`
  );
  if (!stage1.ok) return stage1;
  return anthropicMessage(
    apiKey,
    model,
    "Eres director de estrategia FIFER. Entregas insights accionables en español, claros y profesionales.",
    stage1.finalOutput
  );
}

function resolveGeminiModel(): string {
  return process.env.FIFER_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function resolveAnthropicModel(): string {
  return process.env.FIFER_ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

/** Tier free: solo Gemini Flash y/o gpt-4o-mini; nunca Claude ni gpt-4o. */
async function cascadeFreeTier(
  prompt: string,
  options: ProcessInsightOptions | undefined,
  tierErrors: CascadeTierFailure[]
): Promise<{ finalOutput: string }> {
  const geminiKey = geminiApiKey();
  const geminiModel = resolveGeminiModel();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (geminiKey) {
    try {
      const r1 = await geminiDualStage(
        geminiKey,
        geminiModel,
        prompt,
        options
      );
      if (r1.ok) return { finalOutput: r1.finalOutput };
      logCascadeFailure("gemini", r1.reason);
      tierErrors.push({ tier: 1, provider: "gemini", detail: r1.reason });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logCascadeFailure("gemini", msg);
      tierErrors.push({ tier: 1, provider: "gemini", detail: msg });
    }
  } else {
    const msg =
      "GEMINI_API_KEY / GOOGLE_AI_API_KEY no configurada (modelo gratuito primario).";
    logCascadeFailure("gemini", msg);
    tierErrors.push({ tier: 1, provider: "gemini", detail: msg });
  }

  if (openaiKey) {
    try {
      const r2 = await openaiDualStage(
        openaiKey,
        OPENAI_FREE_MODEL,
        prompt,
        options
      );
      if (r2.ok) return { finalOutput: r2.finalOutput };
      logCascadeFailure("openai-mini", r2.reason);
      tierErrors.push({
        tier: 2,
        provider: "openai-mini",
        detail: r2.reason,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logCascadeFailure("openai-mini", msg);
      tierErrors.push({ tier: 2, provider: "openai-mini", detail: msg });
    }
  } else {
    const msg = "OPENAI_API_KEY no configurada (rescate gpt-4o-mini).";
    logCascadeFailure("openai-mini", msg);
    tierErrors.push({ tier: 2, provider: "openai-mini", detail: msg });
  }

  throw new AiCascadeExhaustedError(
    "Cascada de IA agotada (tier free): modelos gratuitos agotados; no se permite escalada a premium.",
    tierErrors
  );
}

/** Tier pro: premium (Claude → gpt-4o) y rescate con Gemini Flash. */
async function cascadeProTier(
  prompt: string,
  options: ProcessInsightOptions | undefined,
  tierErrors: CascadeTierFailure[]
): Promise<{ finalOutput: string }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicModel = resolveAnthropicModel();
  let tier = 1;

  if (anthropicKey) {
    try {
      const r = await anthropicDualStage(
        anthropicKey,
        anthropicModel,
        prompt,
        options
      );
      if (r.ok) return { finalOutput: r.finalOutput };
      logCascadeFailure("anthropic", r.reason);
      tierErrors.push({
        tier,
        provider: "anthropic",
        detail: r.reason,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logCascadeFailure("anthropic", msg);
      tierErrors.push({ tier, provider: "anthropic", detail: msg });
    }
    tier += 1;
  }

  if (openaiKey) {
    try {
      const r = await openaiDualStage(
        openaiKey,
        resolveOpenAiPremiumModel(),
        prompt,
        options
      );
      if (r.ok) return { finalOutput: r.finalOutput };
      logCascadeFailure("openai-premium", r.reason);
      tierErrors.push({
        tier,
        provider: "openai-premium",
        detail: r.reason,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logCascadeFailure("openai-premium", msg);
      tierErrors.push({ tier, provider: "openai-premium", detail: msg });
    }
    tier += 1;
  } else if (!anthropicKey) {
    const msg =
      "Sin OPENAI_API_KEY ni ANTHROPIC_API_KEY: no hay modelos premium configurados.";
    logCascadeFailure("tier-premium", msg);
    tierErrors.push({ tier, provider: "none", detail: msg });
    tier += 1;
  }

  const geminiKey = geminiApiKey();
  const geminiModel = resolveGeminiModel();
  if (geminiKey) {
    try {
      const r = await geminiDualStage(
        geminiKey,
        geminiModel,
        prompt,
        options
      );
      if (r.ok) return { finalOutput: r.finalOutput };
      logCascadeFailure("gemini-rescue", r.reason);
      tierErrors.push({
        tier,
        provider: "gemini-rescue",
        detail: r.reason,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logCascadeFailure("gemini-rescue", msg);
      tierErrors.push({ tier, provider: "gemini-rescue", detail: msg });
    }
  } else {
    const msg =
      "GEMINI_API_KEY / GOOGLE_AI_API_KEY no configurada (rescate gratuito).";
    logCascadeFailure("gemini-rescue", msg);
    tierErrors.push({ tier, provider: "gemini-rescue", detail: msg });
  }

  throw new AiCascadeExhaustedError(
    "Cascada de IA agotada (tier pro): premium y rescate gratuito fallaron o no estuvieron disponibles.",
    tierErrors
  );
}

export class AiFallbackCascadeEngine {
  readonly id = ENGINE_ID;

  /**
   * Pipeline dual-stage con bifurcación FinOps por `core.tier`.
   * Éxito: `{ finalOutput }`. Si se agotan los intentos del flujo, lanza `AiCascadeExhaustedError`.
   */
  async processInsight(
    prompt: string,
    core: CoreProfile,
    options?: ProcessInsightOptions
  ): Promise<{ finalOutput: string }> {
    const tierErrors: CascadeTierFailure[] = [];
    const isPro = core.tier === "pro";

    try {
      if (!isPro) {
        return await cascadeFreeTier(prompt, options, tierErrors);
      }
      return await cascadeProTier(prompt, options, tierErrors);
    } catch (error) {
      if (error instanceof AiCascadeExhaustedError) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} error inesperado en processInsight:`, error);
      throw new AiCascadeExhaustedError(
        `Error interno en cascada de IA: ${msg}`,
        tierErrors
      );
    }
  }
}

try {
  EngineRegistry.register("ai-fallback", new AiFallbackCascadeEngine());
} catch (error) {
  console.error(
    `[FIFER Engine] ${ENGINE_ID} — error en registro o fase de carga:`,
    error
  );
}

try {
  void ENGINE_ID;
} catch (error) {
  console.error(`[FIFER Engine] ${ENGINE_ID} — error en fase de carga:`, error);
}
