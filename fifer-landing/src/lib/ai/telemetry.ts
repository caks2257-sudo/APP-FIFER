/**
 * Telemetry & Performance Hub — latencia, éxito y ranking dinámico.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IAiEngine } from "@/lib/ai/ai-engine-types";

const ROLLUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_SAMPLES_FOR_PENALTY = 8;
const MEMORY_CAP = 400;

export type TelemetryRollup = {
  engineId: string;
  sampleSize: number;
  errorRate: number;
  p50Latency: number;
};

type MemoryEvt = { engineId: string; latencyMs: number; ok: boolean; at: number };
const memoryRing: MemoryEvt[] = [];

export function recordAiTelemetryMemory(input: {
  engineId: string;
  latencyMs: number;
  httpStatus: number;
  ok: boolean;
}): void {
  memoryRing.push({
    engineId: input.engineId,
    latencyMs: input.latencyMs,
    ok: input.ok,
    at: Date.now(),
  });
  while (memoryRing.length > MEMORY_CAP) memoryRing.shift();
}

export async function recordAiTelemetryEvent(
  sb: SupabaseClient | null,
  input: { engineId: string; latencyMs: number; httpStatus: number; ok: boolean }
): Promise<void> {
  recordAiTelemetryMemory(input);
  if (!sb) return;
  const { error } = await sb.schema("fifer_platform").from("fifer_ai_telemetry_events").insert({
    engine_id: input.engineId,
    latency_ms: input.latencyMs,
    http_status: input.httpStatus,
    ok: input.ok,
  });
  if (error) {
    console.warn("[FIFER Telemetry] insert:", error.message);
  }
}

export async function fetchTelemetryRollups(
  sb: SupabaseClient,
  engineIds: string[]
): Promise<Map<string, TelemetryRollup>> {
  const map = new Map<string, TelemetryRollup>();
  if (!engineIds.length) return map;

  const since = new Date(Date.now() - ROLLUP_WINDOW_MS).toISOString();
  const { data, error } = await sb
    .schema("fifer_platform")
    .from("fifer_ai_telemetry_events")
    .select("engine_id, latency_ms, ok")
    .gte("created_at", since)
    .in("engine_id", engineIds);

  if (error) {
    return rollupFromMemory(engineIds);
  }
  if (!data?.length) {
    return rollupFromMemory(engineIds);
  }

  const byEngine = new Map<string, { lat: number[]; fails: number; total: number }>();
  for (const row of data as { engine_id: string; latency_ms: number; ok: boolean }[]) {
    const g = byEngine.get(row.engine_id) ?? { lat: [], fails: 0, total: 0 };
    g.total++;
    if (!row.ok) g.fails++;
    g.lat.push(row.latency_ms);
    byEngine.set(row.engine_id, g);
  }

  for (const [id, g] of Array.from(byEngine.entries())) {
    g.lat.sort((a: number, b: number) => a - b);
    const p50 = g.lat[Math.floor(g.lat.length / 2)] ?? 0;
    map.set(id, {
      engineId: id,
      sampleSize: g.total,
      errorRate: g.fails / g.total,
      p50Latency: p50,
    });
  }
  return map;
}

function rollupFromMemory(engineIds: string[]): Map<string, TelemetryRollup> {
  const map = new Map<string, TelemetryRollup>();
  const since = Date.now() - ROLLUP_WINDOW_MS;
  const set = new Set(engineIds);
  const by = new Map<string, { lat: number[]; fails: number; total: number }>();
  for (const e of memoryRing) {
    if (e.at < since || !set.has(e.engineId)) continue;
    const g = by.get(e.engineId) ?? { lat: [], fails: 0, total: 0 };
    g.total++;
    if (!e.ok) g.fails++;
    g.lat.push(e.latencyMs);
    by.set(e.engineId, g);
  }
  for (const [id, g] of Array.from(by.entries())) {
    g.lat.sort((a: number, b: number) => a - b);
    const p50 = g.lat[Math.floor(g.lat.length / 2)] ?? 0;
    map.set(id, {
      engineId: id,
      sampleSize: g.total,
      errorRate: g.fails / g.total,
      p50Latency: p50,
    });
  }
  return map;
}

/** Penalización de score (negativa) si el motor falla o es lento. */
export function telemetryPenalty(rollup: TelemetryRollup): number {
  if (rollup.sampleSize < MIN_SAMPLES_FOR_PENALTY) return 0;
  let p = 0;
  if (rollup.errorRate > 0.15) p -= 1.2;
  else if (rollup.errorRate > 0.08) p -= 0.65;
  else if (rollup.errorRate > 0.04) p -= 0.3;
  if (rollup.p50Latency > 12000) p -= 0.55;
  else if (rollup.p50Latency > 8000) p -= 0.4;
  else if (rollup.p50Latency > 4500) p -= 0.2;
  return p;
}

export async function applyTelemetryRankingAdjustment(
  sb: SupabaseClient,
  engines: IAiEngine[]
): Promise<IAiEngine[]> {
  const ids = engines.map((e) => e.id);
  const rollups = await fetchTelemetryRollups(sb, ids);
  return engines.map((e) => {
    const r = rollups.get(e.id);
    if (!r) return e;
    const pen = telemetryPenalty(r);
    if (pen === 0) return e;
    const nextTs = { ...e.ranking.taskSpecific };
    for (const k of Object.keys(nextTs)) {
      nextTs[k] = Math.max(1, Math.min(10, nextTs[k] + pen));
    }
    return {
      ...e,
      ranking: {
        general: Math.max(1, Math.min(10, e.ranking.general + pen)),
        taskSpecific: nextTs,
      },
    };
  });
}

/** Addon de margen (%) por volatilidad reciente de latencia + errores. */
export async function getTelemetryVolatilityAddonPercent(
  sb: SupabaseClient | null,
  engineId: string
): Promise<number> {
  const sinceIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  let rows: { latency_ms: number; ok: boolean }[] = [];

  if (sb) {
    const { data } = await sb
      .schema("fifer_platform")
      .from("fifer_ai_telemetry_events")
      .select("latency_ms, ok")
      .eq("engine_id", engineId)
      .gte("created_at", sinceIso)
      .limit(200);
    rows = (data ?? []) as { latency_ms: number; ok: boolean }[];
  }

  if (rows.length < 5) {
    const memSince = Date.now() - 6 * 60 * 60 * 1000;
    rows = memoryRing
      .filter((e) => e.engineId === engineId && e.at >= memSince)
      .map((e) => ({ latency_ms: e.latencyMs, ok: e.ok }));
  }

  if (rows.length < 5) return 0;
  const lats = rows.map((r) => r.latency_ms);
  const mean = lats.reduce((a, b) => a + b, 0) / lats.length;
  const variance = lats.reduce((a, b) => a + (b - mean) ** 2, 0) / lats.length;
  const std = Math.sqrt(variance);
  const err = rows.filter((r) => !r.ok).length / rows.length;
  return Math.min(12, std / 450 + err * 14);
}

/** Agregado global en memoria (misma instancia Node) — útil cuando no hay filas en Supabase. */
export function aggregateGlobalTelemetryFromMemory(): {
  sampleCount: number;
  successRatePercent: number;
  avgLatencyMs: number;
} {
  const since = Date.now() - ROLLUP_WINDOW_MS;
  let n = 0;
  let ok = 0;
  let latSum = 0;
  for (const e of memoryRing) {
    if (e.at < since) continue;
    n++;
    if (e.ok) ok++;
    latSum += e.latencyMs;
  }
  return {
    sampleCount: n,
    successRatePercent: n ? (ok / n) * 100 : 0,
    avgLatencyMs: n ? latSum / n : 0,
  };
}
