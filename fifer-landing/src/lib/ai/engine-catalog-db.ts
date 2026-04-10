/**
 * Hidrata el catálogo en memoria desde `fifer_platform.fifer_ai_meta` + ajuste telemetría.
 */

import { createFiferServiceSupabase } from "@/lib/supabase-server";
import type { IAiEngine } from "@/lib/ai/ai-engine-types";
import { metaRowToEngine, type FiferAiMetaRow } from "@/lib/ai/ai-meta-types";
import { setEngineCatalog, resetEngineCatalogToSeed } from "@/lib/ai/engine-manifest";
import { applyTelemetryRankingAdjustment } from "@/lib/ai/telemetry";

export type RefreshCatalogResult = {
  ok: boolean;
  source: "supabase" | "seed";
  count: number;
  error?: string;
};

export async function refreshEngineCatalogFromDatabase(): Promise<RefreshCatalogResult> {
  const sb = createFiferServiceSupabase();
  if (!sb) {
    resetEngineCatalogToSeed();
    return { ok: false, source: "seed", count: 0, error: "Sin SUPABASE_SERVICE_ROLE_KEY" };
  }

  const { data, error } = await sb
    .schema("fifer_platform")
    .from("fifer_ai_meta")
    .select("*")
    .eq("is_active", true)
    .order("engine_id");

  if (error) {
    console.warn("[FIFER AI Catalog] lectura fifer_ai_meta:", error.message);
    resetEngineCatalogToSeed();
    return { ok: false, source: "seed", count: 0, error: error.message };
  }

  const rows = (data ?? []) as FiferAiMetaRow[];
  if (!rows.length) {
    resetEngineCatalogToSeed();
    return { ok: true, source: "seed", count: 0 };
  }

  let engines: IAiEngine[] = rows.map(metaRowToEngine);
  engines = await applyTelemetryRankingAdjustment(sb, engines);
  setEngineCatalog(engines);
  return { ok: true, source: "supabase", count: engines.length };
}
