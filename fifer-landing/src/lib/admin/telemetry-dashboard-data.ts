/**
 * Agregación para AI Command Center — telemetría + CreditOrchestrator + mocks 04_INTEGRATIONS_HEALTH.
 */

import type { IAiEngine } from "@/lib/ai/ai-engine-types";
import { getActiveEngines } from "@/lib/ai/engine-manifest";
import {
  aggregateGlobalTelemetryFromMemory,
  fetchTelemetryRollups,
  type TelemetryRollup,
} from "@/lib/ai/telemetry";
import { createFiferServiceSupabase } from "@/lib/supabase-server";
import { getAiHealthSnapshot } from "@/lib/admin/ai-health-snapshot";
import {
  buildMockMonthlyCostCurve,
  INTEGRATIONS_HEALTH_SERVICES,
  MOCK_TELEMETRY_LIVE_LOGS,
  mockArenaDefaultsForEngine,
  type IntegrationHealthRow,
  type MockTelemetryLogLine,
} from "@/lib/admin/integrations-health-mocks";
import { refreshEngineCatalogFromDatabase } from "@/lib/ai/engine-catalog-db";

export type TelemetryArenaEngine = {
  engineId: string;
  name: string;
  provider: string;
  specialty: string;
  performancePct: number;
  qualityPct: number;
  p50LatencyMs: number | null;
  sampleSize: number;
};

export type TelemetryArenaGroupId = "texto" | "imagen" | "video";

export type TelemetryArenaGroup = {
  id: TelemetryArenaGroupId;
  label: string;
  engines: TelemetryArenaEngine[];
};

export type TelemetryKpis = {
  globalSuccessPercent: number;
  avgLatencyMs: number;
  avgMarginPercent: number;
  dataSource: "live" | "mock" | "hybrid";
};

export type TelemetryCostPoint = { day: string; apiUsd: number; credits: number };

export type TelemetryDashboardPayload = {
  asOfIso: string;
  kpis: TelemetryKpis;
  arena: TelemetryArenaGroup[];
  costCurve: TelemetryCostPoint[];
  liveLogs: MockTelemetryLogLine[];
  integrations: IntegrationHealthRow[];
};

function specialtyGroup(engine: IAiEngine): TelemetryArenaGroupId {
  if (engine.unitType === "seconds") return "video";
  if (engine.unitType === "images") return "imagen";
  return "texto";
}

function performanceFromRollup(r: TelemetryRollup | undefined, engineId: string): number {
  if (!r || r.sampleSize === 0) {
    return mockArenaDefaultsForEngine(engineId).performancePct;
  }
  const cap = 10000;
  const inv = 1 - Math.min(1, r.p50Latency / cap);
  return Math.round(Math.max(8, Math.min(100, inv * 100)));
}

function qualityFromEngine(engine: IAiEngine): number {
  return Math.round(Math.max(10, Math.min(100, (engine.ranking.general / 10) * 100)));
}

function aggregateRollupKpis(rollups: Map<string, TelemetryRollup>): {
  success: number;
  latency: number;
  totalSamples: number;
} {
  let totalS = 0;
  let okS = 0;
  let latW = 0;
  for (const r of Array.from(rollups.values())) {
    totalS += r.sampleSize;
    okS += Math.round(r.sampleSize * (1 - r.errorRate));
    latW += r.p50Latency * r.sampleSize;
  }
  return {
    success: totalS ? (okS / totalS) * 100 : 0,
    latency: totalS ? latW / totalS : 0,
    totalSamples: totalS,
  };
}

const MOCK_KPIS = {
  globalSuccessPercent: 96.4,
  avgLatencyMs: 1180,
  avgMarginPercent: 26.8,
};

export async function getTelemetryDashboardPayload(): Promise<TelemetryDashboardPayload> {
  await refreshEngineCatalogFromDatabase();
  const engines = [...getActiveEngines()];
  const ids = engines.map((e) => e.id);
  const sb = createFiferServiceSupabase();

  let rollups = new Map<string, TelemetryRollup>();
  if (sb && ids.length) {
    rollups = await fetchTelemetryRollups(sb, ids);
  }

  const mem = aggregateGlobalTelemetryFromMemory();
  const agg = aggregateRollupKpis(rollups);

  let globalSuccess = agg.success;
  let avgLatency = agg.latency;
  let dataSource: TelemetryKpis["dataSource"] = "live";

  if (agg.totalSamples < 5) {
    if (mem.sampleCount >= 3) {
      globalSuccess = mem.successRatePercent;
      avgLatency = mem.avgLatencyMs;
      dataSource = "hybrid";
    } else {
      globalSuccess = MOCK_KPIS.globalSuccessPercent;
      avgLatency = MOCK_KPIS.avgLatencyMs;
      dataSource = "mock";
    }
  } else if (mem.sampleCount > 0 && agg.totalSamples < 20) {
    dataSource = "hybrid";
  }

  const healthSnap = getAiHealthSnapshot();
  const marginWeights = healthSnap.costRows.filter((r) => r.revenueUsdEquivalent > 0);
  const avgMarginPercent = marginWeights.length
    ? marginWeights.reduce(
        (a, r) => a + (r.marginUsd / r.revenueUsdEquivalent) * 100,
        0
      ) / marginWeights.length
    : MOCK_KPIS.avgMarginPercent;

  const groups: Record<TelemetryArenaGroupId, TelemetryArenaEngine[]> = {
    texto: [],
    imagen: [],
    video: [],
  };

  for (const engine of engines) {
    const r = rollups.get(engine.id);
    const performancePct = performanceFromRollup(r, engine.id);
    const qualityPct = qualityFromEngine(engine);
    groups[specialtyGroup(engine)].push({
      engineId: engine.id,
      name: engine.name,
      provider: engine.provider,
      specialty: engine.specialty,
      performancePct,
      qualityPct,
      p50LatencyMs: r?.p50Latency ?? null,
      sampleSize: r?.sampleSize ?? 0,
    });
  }

  const sortByQuality = (a: TelemetryArenaEngine, b: TelemetryArenaEngine) =>
    b.qualityPct - a.qualityPct || a.name.localeCompare(b.name);

  const arena: TelemetryArenaGroup[] = [
    { id: "texto", label: "Texto & audio", engines: groups.texto.sort(sortByQuality) },
    { id: "imagen", label: "Imagen", engines: groups.imagen.sort(sortByQuality) },
    { id: "video", label: "Video", engines: groups.video.sort(sortByQuality) },
  ];

  const useEconomyMock = dataSource === "mock" && agg.totalSamples < 5;
  const dailyApiBase =
    healthSnap.costRows.reduce((a, r) => a + r.realApiCostUsd, 0) / Math.max(1, healthSnap.costRows.length);
  const costCurve: TelemetryCostPoint[] = useEconomyMock
    ? buildMockMonthlyCostCurve()
    : buildMockMonthlyCostCurve().map((p, i) => {
        const wave = 0.88 + (i % 11) * 0.018;
        const apiUsd = Math.max(8, dailyApiBase * 12 * wave);
        const credits = Math.round(
          apiUsd * healthSnap.creditsPerUsd * (1 + healthSnap.marginPercent / 100)
        );
        return { day: p.day, apiUsd, credits };
      });

  return {
    asOfIso: new Date().toISOString(),
    kpis: {
      globalSuccessPercent: Math.round(globalSuccess * 10) / 10,
      avgLatencyMs: Math.round(avgLatency),
      avgMarginPercent: Math.round(avgMarginPercent * 10) / 10,
      dataSource,
    },
    arena,
    costCurve,
    liveLogs: [...MOCK_TELEMETRY_LIVE_LOGS],
    integrations: [...INTEGRATIONS_HEALTH_SERVICES],
  };
}
