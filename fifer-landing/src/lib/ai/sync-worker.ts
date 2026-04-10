/**
 * AI Meta-Sync — descubre modelos y precios desde metadatos públicos / APIs de proveedores.
 * Actualiza `fifer_platform.fifer_ai_meta`; logs en consola para administradores.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createFiferServiceSupabase } from "@/lib/supabase-server";
import { ENGINE_MANIFEST_SEED } from "@/lib/ai/engine-manifest-seed";
import { engineToMetaUpsert } from "@/lib/ai/ai-meta-types";
import { refreshEngineCatalogFromDatabase } from "@/lib/ai/engine-catalog-db";

const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";

type OpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  description?: string;
};

function slugFromOpenRouterId(modelId: string): string {
  const s = `or-${modelId}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s.slice(0, 96) || "or-unknown";
}

function inferUnitType(id: string): "tokens" | "images" | "seconds" | "characters" {
  const s = id.toLowerCase();
  if (s.includes("dall-e") || s.includes("dall_e") || s.includes("/flux") || s.includes("image-gen"))
    return "images";
  if (s.includes("video") || s.includes("runway") || s.includes("luma")) return "seconds";
  if (s.includes("tts") || s.includes("speech")) return "characters";
  return "tokens";
}

/** USD por 1K tokens (aprox.) desde pricing OpenRouter (por token). */
function costPerThousandFromOpenRouter(m: OpenRouterModel): number {
  const p = m.pricing?.prompt ? parseFloat(String(m.pricing.prompt)) : 0;
  if (p > 0) return p * 1000;
  return 0.002;
}

function inferRankingFromMeta(desc: string, name: string, ctx: number): {
  general: number;
  taskSpecific: Record<string, number>;
} {
  const t = `${desc} ${name}`.toLowerCase();
  const g = 7.1 + Math.min(1.6, Math.log10(4000 + ctx) / 2.8);
  const ts: Record<string, number> = {};
  if (t.includes("code") || t.includes("codigo")) ts.codigo = Math.min(10, g + 0.9);
  if (t.includes("reason") || t.includes("razon")) ts.razonamiento = Math.min(10, g + 0.7);
  if (t.includes("vision") || t.includes("multimodal")) ts.vision = Math.min(10, g + 0.5);
  if (t.includes("fast") || t.includes("flash") || t.includes("mini")) ts.latencia = Math.min(10, g + 0.4);
  if (t.includes("chicureo") || t.includes("inmob")) ts.chicureo = Math.min(10, g + 0.3);
  return { general: Math.round(g * 10) / 10, taskSpecific: ts };
}

async function bootstrapSeedIfEmpty(sb: SupabaseClient): Promise<void> {
  const { count, error } = await sb
    .schema("fifer_platform")
    .from("fifer_ai_meta")
    .select("engine_id", { count: "exact", head: true });

  if (error) {
    console.warn("[FIFER AI Meta-Sync] count fifer_ai_meta:", error.message);
    return;
  }
  if ((count ?? 0) > 0) return;

  const seedRows = ENGINE_MANIFEST_SEED.map((e) =>
    engineToMetaUpsert(e, { last_sync_source: "seed-bootstrap" })
  );
  const { error: upErr } = await sb.schema("fifer_platform").from("fifer_ai_meta").upsert(seedRows, {
    onConflict: "engine_id",
  });
  if (upErr) {
    console.warn("[FIFER AI Meta-Sync] bootstrap:", upErr.message);
    return;
  }
  console.info(`[FIFER AI Meta-Sync] Bootstrap: ${seedRows.length} motores insertados desde semilla FIFER.`);
}

async function syncOpenRouter(sb: SupabaseClient, discovered: string[]): Promise<number> {
  let n = 0;
  const res = await fetch(OPENROUTER_MODELS, {
    cache: "no-store",
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://fifer.local",
      "X-Title": "FIFER Meta-Sync",
    },
  });
  if (!res.ok) {
    console.warn("[FIFER AI Meta-Sync] OpenRouter HTTP", res.status);
    return 0;
  }
  const json = (await res.json()) as { data?: OpenRouterModel[] };
  const models = json.data ?? [];
  const slice = models.slice(0, 100);

  for (const m of slice) {
    const eid = slugFromOpenRouterId(m.id);
    const ctx = m.context_length ?? 8192;
    const rank = inferRankingFromMeta(m.description || "", m.name || m.id, ctx);
    const unit = inferUnitType(m.id);
    const cost = costPerThousandFromOpenRouter(m);

    const { data: existing } = await sb
      .schema("fifer_platform")
      .from("fifer_ai_meta")
      .select("engine_id")
      .eq("engine_id", eid)
      .maybeSingle();

    if (!existing) {
      discovered.push(eid);
      console.info(
        `[FIFER AI Meta-Sync] Nuevo motor descubierto: ${eid} — "${m.name || m.id}" (OpenRouter) · ctx ${ctx} · ~$${cost.toFixed(4)}/1K tok`
      );
    }

    const provider = (m.id.split("/")[0] || "openrouter").slice(0, 40);
    const row = {
      engine_id: eid,
      provider,
      name: (m.name || m.id).slice(0, 200),
      description: (m.description || "").slice(0, 2000),
      specialty: "Catálogo OpenRouter (auto)",
      cost_per_unit: cost,
      unit_type: unit,
      ranking_general: rank.general,
      ranking_task_specific: rank.taskSpecific,
      context_window_tokens: ctx,
      provider_model_id: m.id,
      last_sync_source: "openrouter",
      metadata: { source: "openrouter", raw_id: m.id },
      is_active: true,
    };

    const { error } = await sb.schema("fifer_platform").from("fifer_ai_meta").upsert(row, {
      onConflict: "engine_id",
    });
    if (!error) n++;
    else console.warn("[FIFER AI Meta-Sync] upsert", eid, error.message);
  }
  return n;
}

async function syncOpenAiModels(sb: SupabaseClient, discovered: string[]): Promise<number> {
  const key = process.env.FIFER_ADMIN_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return 0;
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn("[FIFER AI Meta-Sync] OpenAI models HTTP", res.status);
    return 0;
  }
  const json = (await res.json()) as { data?: { id: string }[] };
  const list = json.data ?? [];
  let n = 0;
  for (const item of list.slice(0, 80)) {
    const mid = item.id;
    const eid = `openai-${mid}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data: existing } = await sb
      .schema("fifer_platform")
      .from("fifer_ai_meta")
      .select("engine_id")
      .eq("engine_id", eid)
      .maybeSingle();
    if (!existing) {
      discovered.push(eid);
      console.info(`[FIFER AI Meta-Sync] Nuevo motor descubierto (OpenAI API): ${eid} — ${mid}`);
    }
    const rank = inferRankingFromMeta(mid, mid, 128000);
    const row = {
      engine_id: eid,
      provider: "OpenAI",
      name: mid,
      description: `Modelo listado en /v1/models (${mid}).`,
      specialty: "OpenAI (sync API)",
      cost_per_unit: 0.005,
      unit_type: inferUnitType(mid),
      ranking_general: rank.general,
      ranking_task_specific: rank.taskSpecific,
      context_window_tokens: mid.includes("gpt-4") ? 128000 : 16384,
      provider_model_id: mid,
      last_sync_source: "openai-models",
      metadata: { source: "openai" },
      is_active: true,
    };
    const { error } = await sb.schema("fifer_platform").from("fifer_ai_meta").upsert(row, {
      onConflict: "engine_id",
    });
    if (!error) n++;
  }
  return n;
}

async function syncGoogleModels(sb: SupabaseClient, discovered: string[]): Promise<number> {
  const key = process.env.FIFER_ADMIN_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return 0;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.warn("[FIFER AI Meta-Sync] Google models HTTP", res.status);
    return 0;
  }
  const json = (await res.json()) as { models?: { name: string; displayName?: string; description?: string }[] };
  const list = json.models ?? [];
  let n = 0;
  for (const m of list.slice(0, 40)) {
    const mid = m.name.replace(/^models\//, "");
    const eid = `google-${mid}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data: existing } = await sb
      .schema("fifer_platform")
      .from("fifer_ai_meta")
      .select("engine_id")
      .eq("engine_id", eid)
      .maybeSingle();
    if (!existing) {
      discovered.push(eid);
      console.info(`[FIFER AI Meta-Sync] Nuevo motor descubierto (Google): ${eid} — ${mid}`);
    }
    const rank = inferRankingFromMeta(m.description || "", m.displayName || mid, 100000);
    const row = {
      engine_id: eid,
      provider: "Google",
      name: m.displayName || mid,
      description: (m.description || "").slice(0, 2000),
      specialty: "Google Generative Language (sync API)",
      cost_per_unit: 0.00035,
      unit_type: "tokens" as const,
      ranking_general: rank.general,
      ranking_task_specific: rank.taskSpecific,
      context_window_tokens: mid.includes("1.5") ? 1000000 : 32000,
      provider_model_id: mid,
      last_sync_source: "google-generative-language",
      metadata: { source: "google" },
      is_active: true,
    };
    const { error } = await sb.schema("fifer_platform").from("fifer_ai_meta").upsert(row, {
      onConflict: "engine_id",
    });
    if (!error) n++;
  }
  return n;
}

export type AiMetaSyncResult = {
  ok: boolean;
  openRouterUpserts: number;
  openAiUpserts: number;
  googleUpserts: number;
  discovered: string[];
  catalogRefreshed: boolean;
  message?: string;
};

/**
 * Ejecutar desde cron (`POST /api/ai/sync`) o tarea programada.
 */
export async function runAiMetaSync(): Promise<AiMetaSyncResult> {
  const discovered: string[] = [];
  const sb = createFiferServiceSupabase();
  if (!sb) {
    console.warn("[FIFER AI Meta-Sync] Sin SUPABASE_SERVICE_ROLE_KEY — catálogo solo memoria/semilla.");
    await refreshEngineCatalogFromDatabase();
    return {
      ok: false,
      openRouterUpserts: 0,
      openAiUpserts: 0,
      googleUpserts: 0,
      discovered,
      catalogRefreshed: true,
      message: "Sin service role",
    };
  }

  await bootstrapSeedIfEmpty(sb);
  if (!process.env.FIFER_ADMIN_ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.info(
      "[FIFER AI Meta-Sync] Anthropic: sin clave — sin listado público de modelos; usar OpenRouter u overrides manuales."
    );
  }
  const orN = await syncOpenRouter(sb, discovered);
  const oaN = await syncOpenAiModels(sb, discovered);
  const ggN = await syncGoogleModels(sb, discovered);
  const cat = await refreshEngineCatalogFromDatabase();

  console.info(
    `[FIFER AI Meta-Sync] Completado — OpenRouter: ${orN}, OpenAI: ${oaN}, Google: ${ggN}, catálogo: ${cat.count} (${cat.source})`
  );

  return {
    ok: true,
    openRouterUpserts: orN,
    openAiUpserts: oaN,
    googleUpserts: ggN,
    discovered,
    catalogRefreshed: cat.ok,
  };
}
