/**
 * Puente entre Universal Engines (`src/engines/`) y el protocolo Shell (`BoxLoader` / `BoxProps`).
 */
import type { BoxProps } from "@/types/fifer-box";
import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { toBoxPropsData } from "@/utils/adapters/to-box-props";
import type { FiferNormalizedOutput } from "../../../../src/types/fifer-engine";
import type {
  FiferBoxDataNormalized as FiferScraperShellRow,
  FiferBoxResponseContract,
} from "../../../../src/types/fifer-box";
import type { ContentBoxResponseContract } from "../../../../src/engines/ContentEngine";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Convierte salida del `ScraperEngine` / `ScrapingEngine` a `BoxProps.data` consumible por el loader.
 */
export function adaptScraperEngineToBoxProps(
  out: FiferNormalizedOutput<FiferBoxResponseContract<FiferScraperShellRow> | Record<string, unknown>>
): BoxProps["data"] {
  if (out.status !== "success" || !isRecord(out.data)) {
    return toBoxPropsData({
      source: "generic",
      title: "Ingestor · motor",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: out.errors?.[0] ?? "engine-error", sourceHint: "scraper-engine" },
      raw: out,
    } as FiferBoxDataNormalized);
  }

  const shell = out.data as unknown as FiferBoxResponseContract<FiferScraperShellRow>;
  const row = shell.data;
  if (!row) {
    const errMsg = shell.error?.message ?? "Sin datos normalizados";
    return toBoxPropsData({
      source: "generic",
      title: "Ingestor · sin payload",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: errMsg, sourceHint: "scraper-engine" },
      raw: out,
    } as FiferBoxDataNormalized);
  }

  const normalized: FiferBoxDataNormalized = {
    source: "scraper",
    title: row.title,
    metrics: row.metrics as Record<string, string | number>,
    canonicalRecords: row.canonicalRecords as FiferBoxDataNormalized["canonicalRecords"],
    meta: { sourceHint: "scraper-engine", ghostMode: false },
    raw: {
      keyPoints: row.keyPoints,
      summary: row.summary,
      url: row.url,
      module: row.module,
      engineConfig: shell.config,
      manifest: shell.manifest,
    },
  };

  return {
    ...toBoxPropsData(normalized),
    engineManifest: shell.manifest,
    engineConfig: shell.config,
  };
}

/**
 * Convierte salida del `ContentEngine` (Dual-Stage) a `BoxProps.data`.
 */
export function adaptContentEngineToBoxProps(
  out: FiferNormalizedOutput<ContentBoxResponseContract | Record<string, unknown>>
): BoxProps["data"] {
  if (out.status !== "success" || !isRecord(out.data)) {
    return toBoxPropsData({
      source: "generic",
      title: "Contenido · motor",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: out.errors?.[0] ?? "engine-error", sourceHint: "content-engine" },
      raw: out,
    } as FiferBoxDataNormalized);
  }

  const shell = out.data as unknown as ContentBoxResponseContract;
  const row = shell.data;
  if (!row) {
    return toBoxPropsData({
      source: "generic",
      title: "Contenido · sin payload",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: shell.error?.message ?? "empty", sourceHint: "content-engine" },
      raw: out,
    } as FiferBoxDataNormalized);
  }

  const normalized: FiferBoxDataNormalized = {
    source: "content-engine",
    title: row.title,
    metrics: {
      artifacts: row.executionArtifacts.length,
      refining: shell.config.isRefining ? 1 : 0,
    },
    series: row.executionArtifacts.map((a, i) => ({
      label: `${a.type} · ${a.hook ?? i}`,
      value: a.caption.length,
    })),
    meta: { sourceHint: "content-engine" },
    raw: {
      masterPrompt: row.masterPrompt,
      artifacts: row.executionArtifacts,
      dna: row.dnaSnapshot,
      engineConfig: shell.config,
      manifest: shell.manifest,
    },
  };

  return {
    ...toBoxPropsData(normalized),
    engineManifest: shell.manifest,
    engineConfig: shell.config,
    isRefining: shell.config.isRefining,
    requiresProMotor: Boolean(shell.config.requiresProExecution),
  };
}

/**
 * Enrutador por `engineId` para hidratar el Box tras `engineDispatcher.dispatch`.
 */
export function adaptEngineResultToBoxProps(
  engineId: string,
  out: FiferNormalizedOutput<unknown>
): BoxProps["data"] {
  if (engineId === "content-engine") {
    return adaptContentEngineToBoxProps(out as FiferNormalizedOutput<ContentBoxResponseContract>);
  }
  if (engineId === "scraper-engine" || engineId === "scraping-engine") {
    return adaptScraperEngineToBoxProps(out as FiferNormalizedOutput<FiferBoxResponseContract<FiferScraperShellRow>>);
  }
  return toBoxPropsData({
    source: "generic",
    title: "Motor genérico",
    metrics: { _degraded: 1 },
    meta: { degraded: true, reason: `Sin adaptador explícito para engineId=${engineId}`, sourceHint: "engine-bridge" },
    raw: out,
  } as FiferBoxDataNormalized);
}

export { SHELL_ENGINE_IDS } from "@/lib/shell-engine-ids";
