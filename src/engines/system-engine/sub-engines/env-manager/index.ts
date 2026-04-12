/**
 * Sub-Engine `system-engine:env-manager` — lectura/escritura del `.env` físico solo en desarrollo (§14).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { EngineRegistry } from '@/registry/engine-registry';

const SUB_ENGINE_ID = 'system-engine:env-manager' as const;
const LOG_PREFIX = `[FIFER SubEngine ${SUB_ENGINE_ID}]`;

const BLOCKED_MSG =
  '[env-manager] Acceso al archivo .env bloqueado: solo disponible con NODE_ENV=development.';

const MAX_EVENTS = 48;
const eventRing: EnvManagerEvent[] = [];

export type EnvManagerEvent = {
  ts: string;
  level: 'info' | 'warn';
  message: string;
};

function recordEnvManagerEvent(message: string, level: EnvManagerEvent['level'] = 'info') {
  eventRing.unshift({
    ts: new Date().toISOString(),
    level,
    message,
  });
  if (eventRing.length > MAX_EVENTS) {
    eventRing.length = MAX_EVENTS;
  }
}

/** Últimos eventos de seguridad / auditoría (solo proceso actual; Sala de Guerra §16). */
export function getEnvManagerRecentEvents(): EnvManagerEvent[] {
  return [...eventRing];
}

export function assertEnvFileAccessAllowed(): void {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(BLOCKED_MSG);
  }
}

export function getProjectEnvPath(): string {
  return join(process.cwd(), '.env');
}

/**
 * Lee el contenido del `.env` en la raíz del proyecto. Bloqueado fuera de `development`.
 */
let lastReadLogAt = 0;

export async function readEnvFile(): Promise<string> {
  assertEnvFileAccessAllowed();
  const raw = await readFile(getProjectEnvPath(), 'utf8');
  const now = Date.now();
  if (now - lastReadLogAt > 4000) {
    lastReadLogAt = now;
    recordEnvManagerEvent(`readEnvFile snapshot (${raw.length} bytes)`, 'info');
  }
  return raw;
}

/**
 * Escribe el `.env` completo en la raíz del proyecto. Bloqueado fuera de `development`.
 */
export async function writeEnvFile(content: string): Promise<void> {
  assertEnvFileAccessAllowed();
  await writeFile(getProjectEnvPath(), content, 'utf8');
  recordEnvManagerEvent(`writeEnvFile OK (${content.length} bytes)`, 'info');
}

export type EnvManagerSubEngineApi = {
  readonly id: typeof SUB_ENGINE_ID;
  getHealthStatus: () => { ok: boolean; id: string; envAccess: 'development-only' };
};

class EnvManagerSubEngine implements EnvManagerSubEngineApi {
  readonly id = SUB_ENGINE_ID;

  getHealthStatus(): { ok: boolean; id: string; envAccess: 'development-only' } {
    return {
      ok: true,
      id: SUB_ENGINE_ID,
      envAccess: 'development-only',
    };
  }
}

try {
  EngineRegistry.register(SUB_ENGINE_ID, new EnvManagerSubEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

try {
  void SUB_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}

if (process.env.NODE_ENV === 'development') {
  recordEnvManagerEvent('Sub-Engine env-manager: auditoría Sala de Guerra lista (§16)', 'info');
}
