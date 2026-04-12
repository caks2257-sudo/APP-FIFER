/**
 * Sondas ligeras de latencia hacia integraciones Bridge con clave LIVE.
 * Descubrimiento dinámico vía `discoverIntegrationsFromEnv` / `describeDiscoveredKey`.
 * No expone secretos; solo tiempos y éxito HTTP.
 */

import { describeDiscoveredKey, discoverEnvKeysPresent } from './discovery';
import { BRIDGE_ENV_BINDINGS, isPlaceholderSecret } from './keys';

const PING_TIMEOUT_MS = 2500;

export type BridgeActivePing = {
  /** Slug estable por familia de sonda (p. ej. `openai`, `supabase`, `anthropic`). */
  id: string;
  label: string;
  ok: boolean;
  latencyMs: number;
  skipped?: boolean;
  note?: string;
};

async function timedFetch(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
  const start = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, latencyMs: Date.now() - start, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function snapshotProcessEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function isLiveKey(envKey: string, env: Record<string, string>): boolean {
  return !isPlaceholderSecret(env[envKey]);
}

function pickEnvKey(
  env: Record<string, string>,
  predicate: (k: string) => boolean,
): string | undefined {
  return Object.keys(env).find(predicate);
}

function supabaseProjectUrl(env: Record<string, string>): string | null {
  const raw =
    pickEnvKey(env, (k) => {
      const u = k.toUpperCase();
      return (
        u === 'NEXT_PUBLIC_SUPABASE_URL' ||
        u === 'SUPABASE_URL' ||
        u === 'EXPO_PUBLIC_SUPABASE_URL'
      );
    }) ?? '';
  const v = raw ? env[raw]?.trim() : '';
  if (!v) return null;
  return v.replace(/\/$/, '');
}

/**
 * Identificador de sonda alineado con el descubrimiento de llaves (misma familia = misma barra de latencia).
 * Exportado para cruce fila ↔ sonda en la UI (Data-Driven).
 */
export function resolveBridgeProbeId(envKey: string): string {
  const k = envKey.toUpperCase();
  const meta = describeDiscoveredKey(envKey);
  if (meta?.groupId) return meta.groupId;

  const bridge = BRIDGE_ENV_BINDINGS.find((b) => b.envKey === envKey);
  if (bridge?.integrationId === 'payments') return 'flow';
  if (bridge?.integrationId === 'billing') return 'stripe';
  if (bridge?.integrationId === 'banking') return 'fintoc';

  if (k.includes('SUPABASE')) return 'supabase';
  if (k.includes('OPENAI')) return 'openai';
  if (k.includes('ANTHROPIC')) return 'anthropic';
  if (
    k.includes('GEMINI') ||
    k.includes('GOOGLE_AI') ||
    k.includes('GENERATIVE_AI') ||
    k === 'GOOGLE_API_KEY'
  ) {
    return 'gemini';
  }
  if (k.includes('GROQ')) return 'groq';
  if (k.includes('ELEVEN') || k.includes('ELEVENLABS')) return 'elevenlabs';
  if (k.includes('RUNWAY')) return 'runway';
  if (k === 'FLOW_API_KEY' || (k.startsWith('FLOW_') && k.includes('FLOW'))) return 'flow';
  if (k.includes('STRIPE')) return 'stripe';
  if (k.includes('FINTOC')) return 'fintoc';
  if (k.startsWith('VERCEL_')) return 'vercel';
  if (k.startsWith('GITHUB_') || k === 'GH_TOKEN' || k === 'GITHUB_TOKEN') return 'github';
  if (k.startsWith('SHOPIFY') || k.includes('SHOPIFY')) return 'shopify';
  if (k.startsWith('META_') || k.startsWith('FB_') || k.includes('FACEBOOK')) return 'meta';
  if (k.includes('INSTAGRAM')) return 'instagram';
  if (k.includes('LINKEDIN')) return 'linkedin';
  if (k.startsWith('ALI_') || k.includes('ALIBABA')) return 'alibaba';
  if (k.startsWith('ML_') || k.includes('MERCADOLIBRE')) return 'mercadolibre';
  if (k.startsWith('EBAY_')) return 'ebay';
  if (k.startsWith('AMAZON_') || k.includes('AMAZON')) return 'amazon';

  return `discovered:${k.replace(/[^A-Z0-9_]+/g, '_').slice(0, 48)}`;
}

function defaultLabelForProbe(probeId: string): string {
  const labels: Record<string, string> = {
    supabase: 'Supabase',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    groq: 'Groq',
    elevenlabs: 'ElevenLabs',
    runway: 'Runway',
    flow: 'Flow (flow.cl)',
    stripe: 'Stripe',
    fintoc: 'Fintoc',
    vercel: 'Vercel',
    github: 'GitHub API',
    shopify: 'Shopify',
    meta: 'Meta / Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    alibaba: 'Alibaba',
    mercadolibre: 'Mercado Libre',
    ebay: 'eBay',
    amazon: 'Amazon',
  };
  return labels[probeId] ?? probeId.replace(/^discovered:/, 'Integración');
}

type LiveProbe = { probeId: string; label: string };

function collectLiveProbes(env: Record<string, string>): LiveProbe[] {
  const keys = new Set([
    ...discoverEnvKeysPresent(env),
    ...BRIDGE_ENV_BINDINGS.map((b) => b.envKey),
  ]);

  const byProbe = new Map<string, string>();

  for (const envKey of keys) {
    if (!isLiveKey(envKey, env)) continue;
    const probeId = resolveBridgeProbeId(envKey);
    if (byProbe.has(probeId)) continue;
    const meta = describeDiscoveredKey(envKey);
    const bridge = BRIDGE_ENV_BINDINGS.find((b) => b.envKey === envKey);
    const label = meta?.label ?? bridge?.label ?? defaultLabelForProbe(probeId);
    byProbe.set(probeId, label);
  }

  return [...byProbe.entries()]
    .map(([probeId, label]) => ({ probeId, label }))
    .sort((a, b) => a.probeId.localeCompare(b.probeId));
}

async function pingOpenAi(env: Record<string, string>): Promise<BridgeActivePing> {
  const key = pickEnvKey(env, (k) => k.toUpperCase().includes('OPENAI'));
  if (!key || !env[key]?.trim()) {
    return {
      id: 'openai',
      label: 'OpenAI',
      ok: false,
      latencyMs: 0,
      skipped: true,
      note: 'Sin clave OPENAI (no debería ocurrir si la sonda está en cola LIVE)',
    };
  }
  const r = await timedFetch('https://api.openai.com/v1/models?limit=1', {
    headers: {
      Authorization: `Bearer ${env[key]!.trim()}`,
      Accept: 'application/json',
    },
  });
  return {
    id: 'openai',
    label: 'OpenAI API',
    ok: r.ok && r.status < 500,
    latencyMs: r.latencyMs,
    note: r.ok
      ? `models OK (${r.latencyMs} ms)`
      : `HTTP ${r.status}${r.error ? ` · ${r.error}` : ''}`,
  };
}

async function pingSupabase(env: Record<string, string>): Promise<BridgeActivePing> {
  const base = supabaseProjectUrl(env);
  if (!base) {
    return {
      id: 'supabase',
      label: 'Supabase',
      ok: false,
      latencyMs: 0,
      skipped: true,
      note: 'Sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL',
    };
  }
  const url = `${base}/auth/v1/health`;
  const r = await timedFetch(url, { headers: { Accept: 'application/json' } });
  return {
    id: 'supabase',
    label: 'Supabase (auth health)',
    ok: r.ok && (r.status === 200 || r.status === 401),
    latencyMs: r.latencyMs,
    note: r.ok ? `health ${r.latencyMs} ms` : `HTTP ${r.status}${r.error ? ` · ${r.error}` : ''}`,
  };
}

async function pingAnthropic(env: Record<string, string>): Promise<BridgeActivePing> {
  const key = pickEnvKey(env, (k) => k.toUpperCase().includes('ANTHROPIC'));
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key && env[key]?.trim()) {
    headers['x-api-key'] = env[key]!.trim();
    headers['anthropic-version'] = '2023-06-01';
  }
  let r = await timedFetch('https://api.anthropic.com/v1/models', {
    method: 'GET',
    headers,
  });
  if (r.status === 404 || r.status === 405) {
    r = await timedFetch('https://api.anthropic.com/', { method: 'GET', headers });
  }
  const ok = r.status === 200 || r.status === 401 || r.status === 403 || r.status === 404;
  return {
    id: 'anthropic',
    label: key ? 'Anthropic API' : 'Anthropic (red)',
    ok,
    latencyMs: r.latencyMs,
    note: key
      ? `api.anthropic.com ${r.status} (${r.latencyMs} ms)`
      : `api.anthropic.com (${r.latencyMs} ms)`,
  };
}

async function pingGemini(): Promise<BridgeActivePing> {
  const url =
    'https://generativelanguage.googleapis.com/$discovery/rest?version=v1';
  const r = await timedFetch(url, { headers: { Accept: 'application/json' } });
  return {
    id: 'gemini',
    label: 'Google Gemini (discovery)',
    ok: r.ok || r.status === 404,
    latencyMs: r.latencyMs,
    note: `generativelanguage.googleapis.com (${r.latencyMs} ms)`,
  };
}

async function pingGroq(env: Record<string, string>): Promise<BridgeActivePing> {
  const key = pickEnvKey(env, (k) => k.toUpperCase().includes('GROQ'));
  if (key && env[key]?.trim()) {
    const r = await timedFetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${env[key]!.trim()}`,
        Accept: 'application/json',
      },
    });
    return {
      id: 'groq',
      label: 'Groq API',
      ok: r.ok && r.status < 500,
      latencyMs: r.latencyMs,
      note: `models ${r.status} (${r.latencyMs} ms)`,
    };
  }
  const r = await timedFetch('https://api.groq.com/', { method: 'GET' });
  return {
    id: 'groq',
    label: 'Groq (red)',
    ok: r.latencyMs > 0,
    latencyMs: r.latencyMs,
    note: `api.groq.com (${r.latencyMs} ms)`,
  };
}

async function pingElevenLabs(env: Record<string, string>): Promise<BridgeActivePing> {
  const key = pickEnvKey(
    env,
    (k) => k.toUpperCase().includes('ELEVEN') || k.toUpperCase().includes('XI_API'),
  );
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key && env[key]?.trim()) {
    headers['xi-api-key'] = env[key]!.trim();
  }
  const r = await timedFetch('https://api.elevenlabs.io/v1/user', {
    method: 'GET',
    headers,
  });
  return {
    id: 'elevenlabs',
    label: key ? 'ElevenLabs API' : 'ElevenLabs (red)',
    ok: r.status === 200 || r.status === 401 || r.status === 403,
    latencyMs: r.latencyMs,
    note: `api.elevenlabs.io (${r.latencyMs} ms)`,
  };
}

async function pingRunway(): Promise<BridgeActivePing> {
  const r = await timedFetch('https://api.runwayml.com/', { method: 'GET' });
  return {
    id: 'runway',
    label: 'Runway (red)',
    ok: r.latencyMs > 0,
    latencyMs: r.latencyMs,
    note: `api.runwayml.com (${r.latencyMs} ms)`,
  };
}

async function pingFlow(): Promise<BridgeActivePing> {
  const r = await timedFetch('https://www.flow.cl/', {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });
  return {
    id: 'flow',
    label: 'Flow (flow.cl)',
    ok: r.ok || r.status === 301 || r.status === 302 || r.status === 200,
    latencyMs: r.latencyMs,
    note: `origen Chile (${r.latencyMs} ms)`,
  };
}

async function pingStripe(): Promise<BridgeActivePing> {
  const r = await timedFetch('https://api.stripe.com/v1/', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return {
    id: 'stripe',
    label: 'Stripe API',
    ok: r.status === 401 || r.status === 403 || r.status === 200,
    latencyMs: r.latencyMs,
    note: `api.stripe.com (${r.latencyMs} ms)`,
  };
}

async function pingFintoc(): Promise<BridgeActivePing> {
  const r = await timedFetch('https://api.fintoc.com/v1/', { method: 'GET' });
  return {
    id: 'fintoc',
    label: 'Fintoc API',
    ok: r.latencyMs > 0 && (r.status < 500 || r.status === 401 || r.status === 403),
    latencyMs: r.latencyMs,
    note: `api.fintoc.com (${r.latencyMs} ms)`,
  };
}

async function pingVercel(): Promise<BridgeActivePing> {
  const r = await timedFetch('https://api.vercel.com/', { method: 'GET' });
  return {
    id: 'vercel',
    label: 'Vercel API',
    ok: r.latencyMs > 0,
    latencyMs: r.latencyMs,
    note: `api.vercel.com (${r.latencyMs} ms)`,
  };
}

async function pingGithub(): Promise<BridgeActivePing> {
  const r = await timedFetch('https://api.github.com/rate_limit', {
    headers: { Accept: 'application/vnd.github+json' },
  });
  return {
    id: 'github',
    label: 'GitHub API',
    ok: r.ok || r.status === 403,
    latencyMs: r.latencyMs,
    note: `api.github.com (${r.latencyMs} ms)`,
  };
}

async function pingGenericDomain(
  probeId: string,
  label: string,
  url: string,
): Promise<BridgeActivePing> {
  const r = await timedFetch(url, { method: 'GET' });
  return {
    id: probeId,
    label,
    ok: r.latencyMs > 0 && r.status < 600,
    latencyMs: r.latencyMs,
    note: `${url} (${r.latencyMs} ms)`,
  };
}

/**
 * Factory de sondas: una entrada por familia LIVE descubierta en env.
 */
async function runPingForProbe(probeId: string, env: Record<string, string>): Promise<BridgeActivePing> {
  switch (probeId) {
    case 'openai':
      return pingOpenAi(env);
    case 'supabase':
      return pingSupabase(env);
    case 'anthropic':
      return pingAnthropic(env);
    case 'gemini':
      return pingGemini();
    case 'groq':
      return pingGroq(env);
    case 'elevenlabs':
      return pingElevenLabs(env);
    case 'runway':
      return pingRunway();
    case 'flow':
      return pingFlow();
    case 'stripe':
      return pingStripe();
    case 'fintoc':
      return pingFintoc();
    case 'vercel':
      return pingVercel();
    case 'github':
      return pingGithub();
    case 'shopify':
      return pingGenericDomain('shopify', 'Shopify', 'https://admin.shopify.com/');
    case 'meta':
      return pingGenericDomain('meta', 'Meta', 'https://graph.facebook.com/');
    case 'instagram':
      return pingGenericDomain('instagram', 'Instagram', 'https://i.instagram.com/');
    case 'linkedin':
      return pingGenericDomain('linkedin', 'LinkedIn', 'https://api.linkedin.com/');
    case 'alibaba':
      return pingGenericDomain('alibaba', 'Alibaba', 'https://open.alibaba.com/');
    case 'mercadolibre':
      return pingGenericDomain(
        'mercadolibre',
        'Mercado Libre',
        'https://api.mercadolibre.com/',
      );
    case 'ebay':
      return pingGenericDomain('ebay', 'eBay', 'https://api.ebay.com/');
    case 'amazon':
      return pingGenericDomain('amazon', 'Amazon', 'https://api.amazon.com/');
    default: {
      if (probeId.startsWith('discovered:')) {
        return {
          id: probeId,
          label: defaultLabelForProbe(probeId),
          ok: false,
          latencyMs: 0,
          skipped: true,
          note: 'Sin endpoint de sonda genérico para esta llave',
        };
      }
      return {
        id: probeId,
        label: defaultLabelForProbe(probeId),
        ok: false,
        latencyMs: 0,
        skipped: true,
        note: 'Sonda no mapeada',
      };
    }
  }
}

/**
 * Sondas en paralelo según llaves LIVE descubiertas (Discovery Engine).
 */
export async function pingBridgeIntegrations(): Promise<BridgeActivePing[]> {
  const env = snapshotProcessEnv();
  const live = collectLiveProbes(env);
  if (live.length === 0) {
    return [];
  }
  const tasks = live.map(async ({ probeId, label }) => {
    const p = await runPingForProbe(probeId, env);
    return { ...p, label };
  });
  return Promise.all(tasks);
}
