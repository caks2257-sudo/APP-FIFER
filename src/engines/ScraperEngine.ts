import type { IFiferBoxManifest } from "../types/fifer-box";
import type { FiferNormalizedOutput } from "../types/fifer-engine";
import {
  FiferBoxDataNormalized,
  FiferBoxResponseContract,
  ScrapingTargetModule,
} from "../types/fifer-box";
import { BaseEngine } from "./BaseEngine";

/** Referencia: `fifer-ingestor/scripts` (AliExpress, Admitad) — IDs lógicos para enrutar extracción. */
export type IngestorProviderId = "aliexpress" | "admitad" | "generic";

export interface ScraperEnginePayload {
  /** URL objetivo (HTTP/S). Obligatoria salvo flujos futuros con credencial de proveedor en backend. */
  url?: string;
  /** Si no hay `url`, se rechaza con error explícito (ingesta real sigue en scripts de `fifer-ingestor/`). */
  providerId?: IngestorProviderId;
  targetModule: ScrapingTargetModule;
}

type ScrapingStage = "preflight" | "refining" | "extraction" | "normalization" | "done" | "error";

type ScrapingMeta = {
  pipeline: Array<{ stage: ScrapingStage; isRefining: boolean; at: string }>;
  providerId?: IngestorProviderId;
};

const MODULE_ACCENT: Record<ScrapingTargetModule, { primary: string; accent: string }> = {
  finance: { primary: "#059669", accent: "#D97706" },
  content: { primary: "#1E3A5F", accent: "#2563EB" },
  affiliates: { primary: "#F59E0B", accent: "#059669" },
};

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeText(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return sanitizeText(match?.[1] ?? "Untitled page");
}

function extractByModule(
  cleanText: string,
  moduleName: ScrapingTargetModule
): {
  summary: string;
  keyPoints: string[];
  records: Array<Record<string, string | number>>;
  metrics: Record<string, string | number>;
} {
  const tokens = cleanText.split(/\s+/).filter(Boolean);
  const sentenceCandidates = cleanText
    .split(/[.!?]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 20);
  const summary = sentenceCandidates.slice(0, 2).join(". ").slice(0, 420) || "No summary available.";

  if (moduleName === "finance") {
    const numericMatches = cleanText.match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/g) ?? [];
    const parsed = numericMatches
      .map((value) => Number.parseFloat(value.replace(/\./g, "").replace(",", ".")))
      .filter((n) => Number.isFinite(n))
      .slice(0, 6);

    return {
      summary,
      keyPoints: sentenceCandidates.slice(0, 4),
      records: parsed.map((value, idx) => ({ label: `metric-${idx + 1}`, value })),
      metrics: {
        numbersDetected: parsed.length,
        wordCount: tokens.length,
      },
    };
  }

  if (moduleName === "affiliates") {
    const linkMatches = cleanText.match(/https?:\/\/[^\s]+/g) ?? [];
    const candidates = linkMatches.filter((href) => /ref=|affiliate|utm_/i.test(href)).slice(0, 6);
    return {
      summary,
      keyPoints: sentenceCandidates.slice(0, 4),
      records: candidates.map((href, idx) => ({ label: `affiliate-link-${idx + 1}`, href })),
      metrics: {
        affiliateLinksDetected: candidates.length,
        wordCount: tokens.length,
      },
    };
  }

  return {
    summary,
    keyPoints: sentenceCandidates.slice(0, 5),
    records: sentenceCandidates.slice(0, 6).map((snippet, idx) => ({
      id: `content-${idx + 1}`,
      snippet: snippet.slice(0, 200),
    })),
    metrics: {
      keySentences: sentenceCandidates.length,
      wordCount: tokens.length,
    },
  };
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "FIFER-ScraperEngine/1.0" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch {
    return `<html><head><title>Fallback capture for ${url}</title></head><body><p>Fallback content used when the origin is unavailable.</p><p>Use this record for deterministic local flows.</p></body></html>`;
  }
}

function buildManifestFragment(args: {
  boxId: string;
  targetModule: ScrapingTargetModule;
  providerId?: IngestorProviderId;
}): Partial<IFiferBoxManifest> {
  const colors = MODULE_ACCENT[args.targetModule];
  return {
    boxId: args.boxId,
    sourceModule: "ingestor",
    targetSlot: "affiliate-feed",
    layout: { minWidth: 4, minHeight: 2, isResizable: true },
    permissions: {
      requiredRole: "user",
      requiresActiveSubscription: false,
    },
    dataDependencies: [
      {
        endpoint: "/api/v1/master/ingest/scrape",
        requiresBYOK: false,
        method: "POST",
      },
    ],
    fallbackStrategy: "ghost",
    themeOverrides: {
      primary: colors.primary,
      accent: colors.accent,
      border: `${colors.accent}33`,
    },
  };
}

export class ScraperEngine extends BaseEngine {
  public readonly engineId: string = "scraper-engine";

  async execute<
    T = ScraperEnginePayload,
    R = FiferNormalizedOutput<FiferBoxResponseContract<FiferBoxDataNormalized> & { manifest: Partial<IFiferBoxManifest> }, ScrapingMeta>,
  >(payload: T): Promise<R> {
    const input = payload as ScraperEnginePayload;
    const pipeline: ScrapingMeta["pipeline"] = [];
    const pushStage = (stage: ScrapingStage, isRefining: boolean) =>
      pipeline.push({ stage, isRefining, at: nowIso() });
    const startedAt = nowIso();

    this.log("info", "execute:start", { targetModule: input.targetModule, providerId: input.providerId });

    pushStage("preflight", false);

    const resolved = this.resolveUrlAndProvider(input);
    if ("reason" in resolved) {
      const err = this.toDiscoveryError(resolved.reason, resolved.code);
      pushStage("error", false);
      this.log("warn", "execute:invalid-input", { reason: resolved.reason, code: resolved.code });
      return {
        engineId: this.engineId,
        status: "error",
        data: {
          data: null,
          config: {
            engineId: this.engineId,
            module: input.targetModule,
            url: input.url ?? "",
            isRefining: false,
            stage: "error",
            generatedAt: startedAt,
          },
          error: {
            message: err.message,
            code: err.code,
          },
          manifest: {},
        },
        errors: [resolved.reason],
        meta: { pipeline, providerId: input.providerId },
        timestamp: nowIso(),
      } as R;
    }

    const { url: targetUrl, providerId } = resolved;
    const manifest = buildManifestFragment({
      boxId: `ingestor-scrape-${input.targetModule}`,
      targetModule: input.targetModule,
      providerId,
    });

    pushStage("refining", true);
    const refinedPrompt = this.refineExtractionPrompt(targetUrl, input.targetModule, providerId);

    pushStage("extraction", false);
    const html = await fetchHtml(targetUrl);
    const cleanText = sanitizeText(html);
    const extracted = extractByModule(cleanText, input.targetModule);

    pushStage("normalization", false);
    const normalized: FiferBoxDataNormalized = {
      source: "scraper",
      module: input.targetModule,
      url: targetUrl,
      title: extractTitle(html),
      summary: extracted.summary,
      keyPoints: extracted.keyPoints,
      canonicalRecords: extracted.records,
      metrics: {
        ...extracted.metrics,
        ...(providerId ? { providerId } : {}),
      },
      raw: {
        htmlLength: html.length,
        refinedPrompt,
      },
    };

    pushStage("done", false);
    this.log("info", "execute:done", { url: targetUrl, title: normalized.title });

    return {
      engineId: this.engineId,
      status: "success",
      data: {
        data: normalized,
        config: {
          engineId: this.engineId,
          module: input.targetModule,
          url: targetUrl,
          isRefining: false,
          stage: "done",
          generatedAt: nowIso(),
        },
        error: null,
        manifest,
      },
      meta: { pipeline, providerId },
      timestamp: nowIso(),
    } as R;
  }

  private resolveUrlAndProvider(
    input: ScraperEnginePayload
  ): { url: string; providerId?: IngestorProviderId } | { reason: string; code: "INVALID_URL" | "MISSING_URL" } {
    const url = input.url?.trim();
    if (url) {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return { reason: "Only HTTP(S) URLs are supported.", code: "INVALID_URL" };
        }
        return { url: parsed.toString(), providerId: input.providerId };
      } catch {
        return { reason: "The provided URL is not valid.", code: "INVALID_URL" };
      }
    }

    if (input.providerId && input.providerId !== "generic") {
      return {
        reason:
          "Se requiere una URL explícita para scraping en este motor. La ingesta por credenciales de proveedor vive en fifer-ingestor/scripts (referencia).",
        code: "MISSING_URL",
      };
    }

    return {
      reason: "Provide `url` (HTTP/HTTPS) or a supported `providerId` with future backend bridge.",
      code: "MISSING_URL",
    };
  }

  private refineExtractionPrompt(
    url: string,
    targetModule: ScrapingTargetModule,
    providerId?: IngestorProviderId
  ): string {
    return [
      `You are refining a scraping query for module "${targetModule}".`,
      providerId ? `Provider context: ${providerId} (ingestor reference; align keys with IFiferBoxManifest).` : "",
      `Target URL: ${url}`,
      "Return high-signal fields and preserve deterministic keys for the Fifer Box UI.",
    ]
      .filter(Boolean)
      .join(" ");
  }
}
