import type { AppPreferences, CoreProfile } from '@/types/user-dna';

/** Cuerpo canónico enviado al backend dual-stage (refinado + análisis). */
export type DualStageChatPayload = {
  moduleId: string;
  boxId: string;
  systemInstruction: string;
  contextData: unknown;
  dna: AppPreferences;
  core: CoreProfile;
};

const DEFAULT_DUAL_STAGE_PATH = '/api/v1/fractal-insight/dual-stage';

function extractInsightText(data: Record<string, unknown>): string | null {
  if (typeof data.insight === 'string' && data.insight.trim()) return data.insight;
  if (typeof data.text === 'string' && data.text.trim()) return data.text;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  const nested = data.result;
  if (nested && typeof nested === 'object') {
    const r = nested as Record<string, unknown>;
    if (typeof r.insight === 'string' && r.insight.trim()) return r.insight;
    if (typeof r.text === 'string' && r.text.trim()) return r.text;
  }
  return null;
}

/**
 * Director de IA: orquesta la llamada HTTP al pipeline dual-stage del backend.
 * La ruta API debe existir en el servidor; si no, el caller debe capturar el error.
 */
export async function runDualStageChatPipeline(
  payload: DualStageChatPayload,
  options?: { path?: string },
): Promise<string> {
  const path = options?.path ?? DEFAULT_DUAL_STAGE_PATH;
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const fallback = await res.text().catch(() => '');
    throw new Error(fallback.trim() || `Dual-stage pipeline failed (${res.status})`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const text = extractInsightText(data);
  if (!text) {
    throw new Error('Dual-stage response missing insight text');
  }
  return text;
}
