/**
 * Motor `system-health` — Micro-Core FIFER (Constitución v6.0)
 * Panóptico / App Desarrollador: pulso global de proveedores AI, APIs internas y EngineRegistry.
 */

import "@/engines/ai-orchestrator-engine";
import "@/engines/bot-engine";
import "@/engines/dom-engine";
import "@/engines/external-bridge-engine";
import "@/engines/finance-engine";
import "@/engines/forecast-core";
import "@/engines/system-engine";

import { INTERNAL_HEALTH_API_PROBES } from "@/config/internal-health-probes";
import { EngineRegistry } from "@/registry/engine-registry";
import { isPlaceholderSecret } from "@fifer/external-bridge-engine";

import type { AiProviderPulse, GlobalHealthStatus, HealthEndpointSnapshot } from "./public-types";

const ENGINE_ID = "system-health" as const;

const PING_TIMEOUT_MS = 2000;

const OPENAI_STATUS_URL = "https://status.openai.com/api/v2/status.json";
/** Discovery REST público (no requiere API key) — latencia y disponibilidad del plano Gemini. */
const GOOGLE_GENAI_DISCOVERY_URL =
  "https://generativelanguage.googleapis.com/$discovery/rest?version=v1";

export type {
  AiProviderPulse,
  EngineSlotSnapshot,
  GlobalHealthStatus,
  HealthEndpointSnapshot,
} from "./public-types";

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

function hasVercelDeployCredentials(): {
  hasHook: boolean;
  hasToken: boolean;
  hasOidc: boolean;
} {
  const hook = process.env.VERCEL_DEPLOY_HOOK?.trim() ?? "";
  const token = process.env.VERCEL_TOKEN?.trim() ?? "";
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim() ?? "";
  return {
    hasHook: Boolean(hook) && !isPlaceholderSecret(hook),
    hasToken: Boolean(token) && !isPlaceholderSecret(token),
    hasOidc: Boolean(oidc) && !isPlaceholderSecret(oidc),
  };
}

/**
 * Sonda configuración Vercel (no dispara deploy): hook, token u OIDC en entorno.
 */
async function probeVercelStatus(): Promise<HealthEndpointSnapshot> {
  const { hasHook, hasToken, hasOidc } = hasVercelDeployCredentials();
  if (!hasHook && !hasToken && !hasOidc) {
    return {
      pulse: "unknown",
      latencyMs: null,
      credentialStatus: "missing_key",
      note:
        "Sin credenciales Vercel efectivas (VERCEL_DEPLOY_HOOK, VERCEL_TOKEN o VERCEL_OIDC_TOKEN). Declárelas en .env o Sala de Guerra — no es modo MOCK hasta completar.",
    };
  }
  const parts: string[] = [];
  if (hasHook) parts.push("VERCEL_DEPLOY_HOOK");
  if (hasToken) parts.push("VERCEL_TOKEN");
  if (hasOidc) parts.push("VERCEL_OIDC_TOKEN");
  return {
    pulse: "up",
    latencyMs: null,
    credentialStatus: "ok",
    note: `Credenciales Vercel presentes (${parts.join(", ")}).`,
  };
}

/**
 * Sonda proyecto Supabase vía REST (anon) + comprobación declarada de JWT server-side (AODS §25.2.2).
 */
async function probeSupabaseStatus(): Promise<HealthEndpointSnapshot> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim() ?? "";

  const missingUrlOrAnon =
    !baseUrl ||
    isPlaceholderSecret(baseUrl) ||
    !anon ||
    isPlaceholderSecret(anon);

  if (missingUrlOrAnon) {
    return {
      pulse: "unknown",
      latencyMs: null,
      credentialStatus: "missing_key",
      note:
        "Faltan NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) y/o NEXT_PUBLIC_SUPABASE_ANON_KEY con valor efectivo. Declárelos en .env o Sala de Guerra.",
    };
  }

  const restUrl = `${baseUrl}/rest/v1/`;
  const r = await timedFetch(restUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });

  let pulse: AiProviderPulse = r.ok ? "up" : "degraded";
  if (r.status === 401 || r.status === 403) {
    pulse = "down";
    return {
      pulse,
      latencyMs: r.latencyMs,
      httpStatus: r.status || undefined,
      invalidKey: true,
      credentialStatus: "invalid_key",
      note: `Clave anon rechazada por Supabase REST (HTTP ${r.status}).`,
    };
  }
  if (!r.ok && r.status >= 500) {
    pulse = "down";
  }
  pulse = latencyTier(pulse, r.latencyMs);

  const jwtMissing = !jwtSecret || isPlaceholderSecret(jwtSecret);
  if (r.ok && jwtMissing) {
    return {
      pulse: "degraded",
      latencyMs: r.latencyMs,
      httpStatus: r.status || undefined,
      credentialStatus: "missing_key",
      note: `REST Supabase accesible (${r.latencyMs} ms); falta SUPABASE_JWT_SECRET para validación server-side / AODS.`,
    };
  }

  return {
    pulse,
    latencyMs: r.latencyMs,
    httpStatus: r.status || undefined,
    credentialStatus: "ok",
    note: r.ok
      ? `REST Supabase accesible (${r.latencyMs} ms); JWT server declarado.`
      : `Supabase REST no OK (HTTP ${r.status || "—"}${r.error ? `: ${r.error}` : ""}).`,
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
  const probeIds = EngineRegistry.listRegisteredIds().filter((id) => id !== ENGINE_ID);
  for (const engineId of probeIds) {
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
    const [openai, google, vercel, supabase, internalEntries] = await Promise.all([
      probeOpenAiStatus(),
      probeGoogleStatus(),
      probeVercelStatus(),
      probeSupabaseStatus(),
      Promise.all(
        INTERNAL_HEALTH_API_PROBES.map(async (probe) => {
          const snap = await probeInternalRoute(
            `${origin}${probe.path}`,
            probe.label,
          );
          return [probe.id, snap] as const;
        }),
      ),
    ]);

    const internal: Record<string, HealthEndpointSnapshot> =
      Object.fromEntries(internalEntries);

    const engines = buildEngineSnapshots();

    return {
      schemaVersion: "1.2-system-health",
      capturedAt: new Date().toISOString(),
      external: { openai, google, vercel, supabase },
      internal,
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
