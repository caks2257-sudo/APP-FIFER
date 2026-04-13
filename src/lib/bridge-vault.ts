import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs/promises';
import path from 'path';

import { BRIDGE_ENV_BINDINGS, parseDotEnv } from '@fifer/external-bridge-engine';

import type { ExternalBridgeVault } from '@/types/external-bridge-vault';

export type { ExternalBridgeVault } from '@/types/external-bridge-vault';

/** Claves adicionales al catálogo Bridge (IA, Twilio/WhatsApp, despliegues). */
const EXTRA_VAULT_ENV_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'FIFER_OPENAI_MODEL',
  'FIFER_AODS_OPENAI_MODEL',
  'FIFER_ANTHROPIC_MODEL',
  /** Vertex AI (proyecto / región / modelo; auth vía ADC en runtime GCP). */
  'FIFER_VERTEX_PROJECT',
  'FIFER_GCP_PROJECT',
  'GOOGLE_CLOUD_PROJECT',
  'GCP_PROJECT',
  'FIFER_VERTEX_LOCATION',
  'VERTEX_AI_LOCATION',
  'FIFER_VERTEX_MODEL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'VERCEL_DEPLOY_HOOK',
] as const;

function vaultEnvKeyList(): readonly string[] {
  const fromBridge = BRIDGE_ENV_BINDINGS.map((b) => b.envKey);
  return [...new Set([...fromBridge, ...EXTRA_VAULT_ENV_KEYS])];
}

function normalizeVaultJsonPayload(raw: unknown): ExternalBridgeVault {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return Object.freeze({});
  }
  const out: Partial<Record<string, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (t) out[k] = t;
  }
  return Object.freeze(out);
}

function resolveGcpProjectId(): string | null {
  const id =
    process.env.FIFER_GCP_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim();
  return id || null;
}

function resolveVaultSecretId(): string {
  return (
    process.env.FIFER_BRIDGE_VAULT_SECRET_ID?.trim() ||
    process.env.FIFER_AI_VAULT_SECRET_ID?.trim() ||
    'fifer-external-bridge-vault'
  );
}

/**
 * Intenta cargar un JSON de credenciales desde Secret Manager (versión latest).
 * Devuelve null si no hay proyecto configurado, error de red/API o JSON inválido.
 */
async function tryLoadVaultFromSecretManager(): Promise<ExternalBridgeVault | null> {
  const projectId = resolveGcpProjectId();
  if (!projectId) return null;

  const secretId = resolveVaultSecretId();
  const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;

  try {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({ name });
    const data = version.payload?.data;
    if (data == null) return null;
    const text = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
    const parsed = JSON.parse(text) as unknown;
    return normalizeVaultJsonPayload(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      `[FIFER Bridge Vault] Secret Manager no disponible (${msg}). Usando fallback local.`,
    );
    return null;
  }
}

async function readDotEnvLocalFile(): Promise<Partial<Record<string, string>>> {
  const filePath = path.join(process.cwd(), '.env.local');
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return parseDotEnv(content);
  } catch {
    return {};
  }
}

/**
 * Fallback local: fusiona `.env.local` (sin sobreescribir claves ya definidas en `process.env`)
 * y toma valores para las claves del vault conocidas.
 */
function buildLocalVault(
  dotLocal: Partial<Record<string, string>>,
): ExternalBridgeVault {
  const out: Partial<Record<string, string>> = {};
  for (const k of vaultEnvKeyList()) {
    const fromEnv = process.env[k]?.trim();
    const fromFile = dotLocal[k]?.trim();
    const v = fromEnv || fromFile;
    if (v) out[k] = v;
  }
  return Object.freeze(out);
}

/**
 * Carga el AI-Vault / Bridge vault: Secret Manager (JSON) primero; si falla, `.env.local` + `process.env`.
 */
export async function loadDecryptedVault(): Promise<ExternalBridgeVault> {
  const fromCloud = await tryLoadVaultFromSecretManager();
  if (fromCloud !== null) {
    return fromCloud;
  }

  const dotLocal = await readDotEnvLocalFile();
  return buildLocalVault(dotLocal);
}
