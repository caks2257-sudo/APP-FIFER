/**
 * Auto-descubrimiento de integraciones desde variables de entorno (prefijos reconocidos).
 * El caller fusiona `process.env` + parseo opcional de `.env` vía env-manager.
 */

import type { BridgeIntegrationId } from './keys';
import { BRIDGE_MACRO_PILLARS } from './keys';
import { isPlaceholderSecret } from './keys';
import type { UnifiedIntegrationPublicStatus } from './integration-types';
import type { IntegrationPublicStatus } from './integration-types';
import type { ResolvedKey } from './bridge-proxy';

export type { UnifiedIntegrationPublicStatus } from './integration-types';

/**
 * Parseo mínimo de `.env` (líneas KEY=VAL, comentarios #, comillas simples/dobles).
 */
export function parseDotEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function humanizeKeySuffix(envKey: string): string {
  const parts = envKey.split('_');
  if (parts.length <= 1) return envKey;
  return parts
    .slice(-2)
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

type DiscoveryMeta = {
  category: import('./keys').BridgeConnectionCategory;
  label: string;
  iconKey: string;
  groupId?: string;
  groupLabel?: string;
};

/**
 * Resuelve etiqueta, categoría e icono para una variable conocida.
 */
export function describeDiscoveredKey(envKey: string): DiscoveryMeta | null {
  const k = envKey.toUpperCase();

  if (
    k === 'SUPABASE_URL' ||
    k === 'NEXT_PUBLIC_SUPABASE_URL' ||
    k === 'EXPO_PUBLIC_SUPABASE_URL'
  ) {
    return {
      category: 'INFRAESTRUCTURA',
      label: 'Supabase — URL del proyecto',
      iconKey: 'Database',
      groupId: 'supabase',
      groupLabel: 'Supabase',
    };
  }
  if (
    k === 'SUPABASE_ANON_KEY' ||
    k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' ||
    k === 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ) {
    return {
      category: 'INFRAESTRUCTURA',
      label: 'Supabase — anon (público)',
      iconKey: 'KeyRound',
      groupId: 'supabase',
      groupLabel: 'Supabase',
    };
  }
  if (k === 'SUPABASE_SERVICE_ROLE_KEY' || k === 'SUPABASE_SERVICE_KEY') {
    return {
      category: 'INFRAESTRUCTURA',
      label: 'Supabase — service role',
      iconKey: 'Shield',
      groupId: 'supabase',
      groupLabel: 'Supabase',
    };
  }
  if (k === 'SUPABASE_JWT_SECRET') {
    return {
      category: 'INFRAESTRUCTURA',
      label: 'Supabase — JWT secret',
      iconKey: 'KeyRound',
      groupId: 'supabase',
      groupLabel: 'Supabase',
    };
  }
  if (k.startsWith('SUPABASE_') || k.includes('SUPABASE')) {
    return {
      category: 'INFRAESTRUCTURA',
      label: `Supabase — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Database',
      groupId: 'supabase',
      groupLabel: 'Supabase',
    };
  }

  if (k.startsWith('VERCEL_')) {
    return {
      category: 'INFRAESTRUCTURA',
      label: `Vercel — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Triangle',
    };
  }
  if (k.startsWith('GITHUB_') || k === 'GH_TOKEN' || k === 'GITHUB_TOKEN') {
    return {
      category: 'INFRAESTRUCTURA',
      label: `GitHub — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'GitBranch',
    };
  }

  /** Macro-Pilar E-COMMERCE — prefijos de tiendas, marketplaces y afiliación (§14 ADN). */
  if (
    k.startsWith('AMAZON_') ||
    (k.includes('AMAZON') && (k.includes('SELLER') || k.includes('MWS'))) ||
    k.startsWith('EBAY_') ||
    k.startsWith('ALI_') ||
    k.startsWith('ML_') ||
    k.startsWith('SHOPIFY_') ||
    k.includes('SHOPIFY') ||
    k.startsWith('WOO_') ||
    k.startsWith('WOOCOMMERCE_') ||
    k.startsWith('CLICKBANK_') ||
    k.startsWith('BIGCOMMERCE_') ||
    k.startsWith('ECOMMERCE_') ||
    k.startsWith('PRESTASHOP_')
  ) {
    return {
      category: 'ECOMMERCE',
      label: `E-commerce — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'ShoppingCart',
    };
  }

  if (
    k.startsWith('FACEBOOK_') ||
    k.startsWith('FB_') ||
    k.startsWith('META_') ||
    k.includes('FACEBOOK_APP')
  ) {
    return {
      category: 'REDES_SOCIALES',
      label: `Facebook / Meta — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Share2',
    };
  }
  if (k.startsWith('INSTAGRAM_') || k.includes('INSTAGRAM')) {
    return {
      category: 'REDES_SOCIALES',
      label: `Instagram — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Camera',
    };
  }
  if (k.startsWith('LINKEDIN_') || k.includes('LINKEDIN')) {
    return {
      category: 'REDES_SOCIALES',
      label: `LinkedIn — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Network',
    };
  }

  if (k.includes('OPENAI') || k.startsWith('OPENAI_')) {
    return {
      category: 'INTELIGENCIA_ARTIFICIAL',
      label: `OpenAI — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Sparkles',
    };
  }
  if (k.includes('ANTHROPIC') || k.startsWith('ANTHROPIC_')) {
    return {
      category: 'INTELIGENCIA_ARTIFICIAL',
      label: `Anthropic — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'MessageSquare',
    };
  }
  if (
    k.includes('GEMINI') ||
    k.includes('GOOGLE_AI') ||
    k.includes('GENERATIVE_AI') ||
    k === 'GOOGLE_API_KEY'
  ) {
    return {
      category: 'INTELIGENCIA_ARTIFICIAL',
      label: `Google AI / Gemini — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Cpu',
    };
  }
  if (k.includes('GROQ')) {
    return {
      category: 'INTELIGENCIA_ARTIFICIAL',
      label: `Groq — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Zap',
    };
  }
  if (k.includes('ELEVEN') || k.includes('ELEVENLABS')) {
    return {
      category: 'INTELIGENCIA_ARTIFICIAL',
      label: `ElevenLabs — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Mic',
    };
  }
  if (k.includes('RUNWAY')) {
    return {
      category: 'INTELIGENCIA_ARTIFICIAL',
      label: `Runway — ${humanizeKeySuffix(envKey)}`,
      iconKey: 'Clapperboard',
    };
  }

  return null;
}

function resolveDiscoveredMode(
  envKey: string,
  env: Record<string, string>,
  vault: Partial<Record<string, string>>,
): { mode: 'MOCK' | 'PROD'; source: ResolvedKey['source'] } {
  const fromVault = vault[envKey]?.trim();
  const fromEnv = env[envKey]?.trim();
  const raw = fromVault || fromEnv || '';
  if (isPlaceholderSecret(raw)) {
    return { mode: 'MOCK', source: 'none' };
  }
  return {
    mode: 'PROD',
    source: fromVault ? 'vault' : 'env',
  };
}

const BRIDGE_ICON: Partial<Record<BridgeIntegrationId, string>> = {
  payments: 'Banknote',
  billing: 'Receipt',
  banking: 'Landmark',
};

export function discoverEnvKeysPresent(env: Record<string, string>): string[] {
  const keys = Object.keys(env).filter((k) => describeDiscoveredKey(k) != null);
  return [...new Set(keys)].sort((a, b) => a.localeCompare(b));
}

export function discoverIntegrationsFromEnv(
  env: Record<string, string>,
  vault: Partial<Record<string, string>>,
  bridgeEnvKeys: Set<string>,
): UnifiedIntegrationPublicStatus[] {
  const out: UnifiedIntegrationPublicStatus[] = [];
  const present = discoverEnvKeysPresent(env);

  for (const envKey of present) {
    if (bridgeEnvKeys.has(envKey)) continue;
    const meta = describeDiscoveredKey(envKey);
    if (!meta) continue;
    const { mode, source } = resolveDiscoveredMode(envKey, env, vault);
    out.push({
      integrationId: `discovered:${envKey}`,
      envKey,
      label: meta.label,
      category: meta.category,
      mode,
      source,
      iconKey: meta.iconKey,
      groupId: meta.groupId,
      groupLabel: meta.groupLabel,
      fromDiscovery: true,
    });
  }
  return out;
}

function bridgeRowToUnified(row: IntegrationPublicStatus): UnifiedIntegrationPublicStatus {
  const bid = row.integrationId as BridgeIntegrationId;
  const iconKey = BRIDGE_ICON[bid] ?? 'Link2';
  return {
    ...row,
    iconKey,
    fromDiscovery: false,
  };
}

export function buildUnifiedIntegrationStatuses(
  bridgeRows: IntegrationPublicStatus[],
  env: Record<string, string>,
  vault: Partial<Record<string, string>>,
): UnifiedIntegrationPublicStatus[] {
  const bridgeKeys = new Set(bridgeRows.map((r) => r.envKey));
  const unifiedBridge = bridgeRows.map(bridgeRowToUnified);
  const discovered = discoverIntegrationsFromEnv(env, vault, bridgeKeys);
  const merged = [...unifiedBridge, ...discovered];
  merged.sort((a, b) => {
    const cat =
      categoryOrder(a.category) - categoryOrder(b.category);
    if (cat !== 0) return cat;
    const g = (a.groupId ?? '').localeCompare(b.groupId ?? '');
    if (g !== 0) return g;
    return a.label.localeCompare(b.label);
  });
  return merged;
}

function categoryOrder(c: import('./keys').BridgeConnectionCategory): number {
  const i = (BRIDGE_MACRO_PILLARS as readonly string[]).indexOf(c);
  return i === -1 ? 99 : i;
}
