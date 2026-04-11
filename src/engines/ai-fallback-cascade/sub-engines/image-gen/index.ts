/**
 * Sub-Engine `image-gen` — hijo fractal de `ai-fallback-cascade` (Constitución v6.0).
 * Generación de imágenes aislada del pipeline de insights de texto.
 */

import { EngineRegistry } from "@/registry/engine-registry";
import type { CoreProfile } from "@/types/user-dna";

const SUB_ENGINE_ID = "ai-fallback:image-gen" as const;
const LOG_PREFIX = `[FIFER SubEngine ${SUB_ENGINE_ID}]`;

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const STABILITY_SD3_URL =
  "https://api.stability.ai/v2beta/stable-image/generate/sd3";
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export type ImageGenQuality = "standard" | "hd" | "low";

export type ImageGenParams = {
  prompt: string;
  aspectRatio?: string;
  quality?: ImageGenQuality;
};

export type ImageGenOk = {
  ok: true;
  imageUrl: string;
  provider: "openai-dalle-3" | "stability-sd" | "pollinations-free";
};

export type ImageGenErr = {
  ok: false;
  code: string;
  reason: string;
};

export type ImageGenResult = ImageGenOk | ImageGenErr;

function isProTier(core: CoreProfile): boolean {
  return core.tier === "pro";
}

function openAiImageSize(aspectRatio?: string): "1024x1024" | "1792x1024" | "1024x1792" {
  const a = (aspectRatio ?? "1:1").trim();
  if (a === "16:9" || a === "1792x1024") return "1792x1024";
  if (a === "9:16" || a === "1024x1792") return "1024x1792";
  return "1024x1024";
}

function stabilityAspectRatio(aspectRatio?: string): string {
  const a = (aspectRatio ?? "1:1").trim();
  const allowed = new Set([
    "1:1",
    "16:9",
    "21:9",
    "2:3",
    "3:2",
    "4:5",
    "5:4",
    "9:16",
    "9:21",
  ]);
  if (allowed.has(a)) return a;
  return "1:1";
}

function pollinationsDimensions(aspectRatio?: string): { width: number; height: number } {
  const a = (aspectRatio ?? "1:1").trim();
  if (a === "16:9") return { width: 1280, height: 720 };
  if (a === "9:16") return { width: 720, height: 1280 };
  return { width: 1024, height: 1024 };
}

function dalleQuality(q?: ImageGenQuality): "standard" | "hd" {
  return q === "hd" ? "hd" : "standard";
}

async function tryOpenAiDalle3(
  apiKey: string,
  params: ImageGenParams
): Promise<ImageGenOk | ImageGenErr> {
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: params.prompt.trim(),
      n: 1,
      size: openAiImageSize(params.aspectRatio),
      quality: dalleQuality(params.quality),
      response_format: "url",
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    return {
      ok: false,
      code: "IMAGEGEN_OPENAI_FAILED",
      reason: raw.trim() || `OpenAI images (${res.status}).`,
    };
  }

  const data = (await res.json()) as {
    data?: Array<{ url?: string }>;
  };
  const url = data.data?.[0]?.url?.trim();
  if (!url) {
    return {
      ok: false,
      code: "IMAGEGEN_OPENAI_EMPTY",
      reason: "Respuesta OpenAI sin URL de imagen.",
    };
  }
  return { ok: true, imageUrl: url, provider: "openai-dalle-3" };
}

async function tryStabilitySd3(
  apiKey: string,
  params: ImageGenParams
): Promise<ImageGenOk | ImageGenErr> {
  const form = new FormData();
  form.append("prompt", params.prompt.trim());
  form.append("output_format", "png");
  form.append("aspect_ratio", stabilityAspectRatio(params.aspectRatio));

  const res = await fetch(STABILITY_SD3_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    return {
      ok: false,
      code: "IMAGEGEN_STABILITY_FAILED",
      reason: raw.trim() || `Stability SD3 (${res.status}).`,
    };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    return {
      ok: false,
      code: "IMAGEGEN_STABILITY_EMPTY",
      reason: "Stability devolvió cuerpo vacío.",
    };
  }

  const b64 = buf.toString("base64");
  return {
    ok: true,
    imageUrl: `data:image/png;base64,${b64}`,
    provider: "stability-sd",
  };
}

function buildPollinationsUrl(params: ImageGenParams): string {
  const { width, height } = pollinationsDimensions(params.aspectRatio);
  const path = encodeURIComponent(params.prompt.trim());
  return `${POLLINATIONS_BASE}/${path}?width=${width}&height=${height}&nologo=true`;
}

export class ImageGenSubEngine {
  readonly id = SUB_ENGINE_ID;

  /**
   * FinOps (Regla 6): `tier !== 'pro'` usa solo fallback gratuito (Pollinations).
   * Tier `pro`: DALL-E 3 → Stability SD3 (si hay clave) → error agotado.
   */
  async generate(
    params: ImageGenParams,
    core: CoreProfile
  ): Promise<ImageGenResult> {
    const prompt = params.prompt?.trim();
    if (!prompt) {
      return {
        ok: false,
        code: "IMAGEGEN_INVALID_PROMPT",
        reason: "El prompt es obligatorio y no puede estar vacío.",
      };
    }

    const normalizedParams: ImageGenParams = {
      ...params,
      prompt,
    };

    if (!isProTier(core)) {
      return {
        ok: true,
        imageUrl: buildPollinationsUrl(normalizedParams),
        provider: "pollinations-free",
      };
    }

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const stabilityKey = process.env.STABILITY_API_KEY?.trim();
    const errors: string[] = [];

    if (openaiKey) {
      try {
        const r = await tryOpenAiDalle3(openaiKey, normalizedParams);
        if (r.ok) return r;
        errors.push(`DALL-E 3: ${r.reason}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`DALL-E 3: ${msg}`);
      }
    } else {
      errors.push("DALL-E 3: OPENAI_API_KEY no configurada.");
    }

    if (stabilityKey) {
      try {
        const r = await tryStabilitySd3(stabilityKey, normalizedParams);
        if (r.ok) return r;
        errors.push(`Stable Diffusion: ${r.reason}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Stable Diffusion: ${msg}`);
      }
    } else {
      errors.push(
        "Stable Diffusion: STABILITY_API_KEY no configurada (rescate)."
      );
    }

    const reason = errors.join(" | ");
    console.error(`${LOG_PREFIX} cascada premium agotada:`, reason);
    return {
      ok: false,
      code: "IMAGEGEN_EXHAUSTED",
      reason,
    };
  }
}

try {
  EngineRegistry.register(SUB_ENGINE_ID, new ImageGenSubEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro o fase de carga:`, error);
}

try {
  void SUB_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
