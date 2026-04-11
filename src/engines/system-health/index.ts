/**
 * Motor `system-health` — Micro-Core FIFER (Constitución v6.0)
 * Panóptico / App Desarrollador: pulso global de proveedores AI, APIs internas y EngineRegistry.
 */

import { EngineRegistry } from "@/registry/engine-registry";

const ENGINE_ID = "system-health" as const;

const PING_TIMEOUT_MS = 2000;

const OPENAI_STATUS_URL = "https://status.openai.com/api/v2/status.json";
/** Discovery REST público (no requiere API key) — latencia y disponibilidad del plano Gemini. */
const GOOGLE_GENAI_DISCOVERY_URL =
  "https://generativelanguage.googleapis.com/$discovery/rest?version=v1";

const ENGINE_PROBE_IDS = [
  "ai-fallback",
  "ai-fallback:image-gen",
  "ai-fallback:comms",
] as const;

export type AiProviderPulse = "up" | "degraded" | "down" | "unknown";

export type HealthEndpointSnapshot = {
  pulse: AiProviderPulse;
  latencyMs: number | null;
  note: string;
  /** Solo APIs con clave configurada: 401/403 en sonda autenticada. */
  invalidKey?: boolean;
  /** Útil para rutas internas HTTP. */
  httpStatus?: number;
};

export type EngineSlotSnapshot = {
  registered: boolean;
  inService: boolean;
  loadHint: "loaded" | "not-mounted";
  pulse: AiProviderPulse;
  note: string;
};

export type GlobalHealthStatus = {
  schemaVersion: "1.0-system-health";
  capturedAt: string;
  external: {
    openai: HealthEndpointSnapshot;
    google: HealthEndpointSnapshot;
  };
  internal: {
    misbots: HealthEndpointSnapshot;
    contratos: HealthEndpointSnapshot;
  };
  engines: {
    byId: Record<string, EngineSlotSnapshot>;
  };
};

async function timedFetch(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
  const start = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    return { ok: res.ok, status: res.status, latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, latencyMs, error: msg };
  } finally {
    clearTimeout(t);
  }
}

async function timedFetchJson(
  url: string,
  init?: RequestInit
): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  data: unknown;
  error?: string;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, latencyMs, data };
  } catch (e) {
    const latencyMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, latencyMs, data: null, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function latencyTier(
  pulse: AiProviderPulse,
  latencyMs: number | null
): AiProviderPulse {
  if (pulse === "down" || pulse === "unknown") return pulse;
  if (latencyMs != null && latencyMs > 500) return "degraded";
  return pulse;
}

async function probeOpenAiStatus(): Promise<HealthEndpointSnapshot> {
  const r = await timedFetchJson(OPENAI_STATUS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    return {
      pulse: "down",
      latencyMs: r.latencyMs,
      note: `Status OpenAI no disponible (HTTP ${r.status || "—"}${r.error ? `: ${r.error}` : ""}).`,
      httpStatus: r.status || undefined,
    };
  }

  const body = r.data as Record<string, unknown> | null;
  const st = body?.status as Record<string, unknown> | undefined;
  let indicator = String(st?.indicator ?? "unknown");
  if (!["none", "minor", "major", "critical"].includes(indicator)) {
    indicator = "unknown";
  }

  let pulse: AiProviderPulse =
    indicator === "none"
      ? "up"
      : indicator === "minor"
        ? "degraded"
        : indicator === "major" || indicator === "critical"
          ? "down"
          : "unknown";

  pulse = latencyTier(pulse, r.latencyMs);

  const baseNote =
    indicator === "none"
      ? `Operativo (status.openai.com, ${r.latencyMs} ms).`
      : `Indicador OpenAI: ${indicator} (${r.latencyMs} ms).`;

  let invalidKey: boolean | undefined;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    const keyProbe = await timedFetch("https://api.openai.com/v1/models?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (keyProbe.status === 401 || keyProbe.status === 403) {
      invalidKey = true;
      pulse = "down";
    } else if (!keyProbe.ok && keyProbe.status >= 400) {
      pulse = latencyTier("degraded", keyProbe.latencyMs);
    }
  }

  return {
    pulse,
    latencyMs: r.latencyMs,
    note: invalidKey
      ? `${baseNote} Clave OPENAI_API_KEY rechazada (HTTP 401/403).`
      : baseNote,
    invalidKey,
    httpStatus: r.status,
  };
}

async function probeGoogleStatus(): Promise<HealthEndpointSnapshot> {
  const r = await timedFetch(GOOGLE_GENAI_DISCOVERY_URL, {
    headers: { Accept: "application/json" },
  });
  let pulse: AiProviderPulse = r.ok ? "up" : "down";
  pulse = latencyTier(pulse, r.latencyMs);

  const note = r.ok
    ? `Discovery Gemini accesible (${r.latencyMs} ms).`
    : `Discovery Gemini no respondió OK (HTTP ${r.status || "—"}${r.error ? `: ${r.error}` : ""}).`;

  let invalidKey: boolean | undefined;
  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (geminiKey) {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(geminiKey)}`;
    const keyProbe = await timedFetch(url, { headers: { Accept: "application/json" } });
    if (keyProbe.status === 401 || keyProbe.status === 403) {
      invalidKey = true;
      pulse = "down";
    } else if (!keyProbe.ok && keyProbe.status >= 400) {
      pulse = latencyTier("degraded", keyProbe.latencyMs);
    }
  }

  return {
    pulse,
    latencyMs: r.latencyMs,
    note: invalidKey
      ? `${note} Clave Gemini / Google Generative AI inválida o sin permiso.`
      : note,
    invalidKey,
    httpStatus: r.status || undefined,
  };
}

async function probeInternalRoute(
  absoluteUrl: string,
  label: string
): Promise<HealthEndpointSnapshot> {
  const r = await timedFetch(absoluteUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const ok = r.ok && r.status >= 200 && r.status < 300;
  let pulse: AiProviderPulse = ok ? "up" : "down";
  pulse = latencyTier(pulse, r.latencyMs);
  return {
    pulse,
    latencyMs: r.latencyMs,
    httpStatus: r.status || undefined,
    note: ok
      ? `${label} responde ${r.status} (${r.latencyMs} ms).`
      : `${label} no disponible (HTTP ${r.status || "—"}${r.error ? `, ${r.error}` : ""}).`,
  };
}

function buildEngineSnapshots(): GlobalHealthStatus["engines"] {
  const byId: GlobalHealthStatus["engines"]["byId"] = {};
  for (const engineId of ENGINE_PROBE_IDS) {
    const registered = EngineRegistry.isRegistered(engineId);
    const inService = registered && EngineRegistry.isInService(engineId);
    let pulse: AiProviderPulse = "down";
    let note = "Motor no montado en EngineRegistry.";
    if (registered && inService) {
      pulse = "up";
      note = "Registrado y en servicio.";
    } else if (registered && !inService) {
      pulse = "degraded";
      note = "Registrado pero fuera de servicio (`enabled: false`).";
    }
    byId[engineId] = {
      registered,
      inService,
      loadHint: registered ? "loaded" : "not-mounted",
      pulse,
      note,
    };
  }
  return { byId };
}

export class SystemHealthEngine {
  readonly id = ENGINE_ID;

  /**
   * Snapshot: pings externos (2 s), rutas internas vía `origin`, y slots críticos del registro.
   */
  async getGlobalStatus(options: { origin: string }): Promise<GlobalHealthStatus> {
    const origin = options.origin.replace(/\/$/, "");
    const [openai, google, misbots, contratos] = await Promise.all([
      probeOpenAiStatus(),
      probeGoogleStatus(),
      probeInternalRoute(`${origin}/api/v1/misbots`, "GET /api/v1/misbots"),
      probeInternalRoute(`${origin}/api/v1/contratos`, "GET /api/v1/contratos"),
    ]);

    const engines = buildEngineSnapshots();

    return {
      schemaVersion: "1.0-system-health",
      capturedAt: new Date().toISOString(),
      external: { openai, google },
      internal: { misbots, contratos },
      engines,
    };
  }
}

try {
  EngineRegistry.register(ENGINE_ID, new SystemHealthEngine());
} catch (error) {
  console.error(`[FIFER Engine] ${ENGINE_ID} — error en registro:`, error);
}

try {
  void ENGINE_ID;
} catch (error) {
  console.error(`[FIFER Engine] ${ENGINE_ID} — error en fase de carga:`, error);
}
