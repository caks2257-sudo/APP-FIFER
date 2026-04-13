import {
  FIFER_CORE_ROUTES,
  fiferCoreApiFetch,
} from '@/lib/fifer-core-api';

/**
 * GET `/api/v1/core/voices` — catálogo ElevenLabs (filtrado en el core).
 */
export function listCoreVoices(init?: RequestInit): Promise<Response> {
  return fiferCoreApiFetch(FIFER_CORE_ROUTES.voicesList, {
    method: 'GET',
    ...init,
  });
}

/**
 * POST `/api/v1/core/select-voice` — persiste `voice_id` en perfil Supabase vía service role (core).
 */
export function selectCoreVoice(
  voiceId: string,
  supabaseUserId: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  headers.set('X-User-Id', supabaseUserId);
  return fiferCoreApiFetch(FIFER_CORE_ROUTES.voiceSelect, {
    ...init,
    method: 'POST',
    headers,
    body: JSON.stringify({ voice_id: voiceId }),
  });
}

/**
 * POST `/api/v1/core/clone-voice` — multipart; no establecer `Content-Type` manualmente.
 * `formData` debe incluir `name` y `file` como espera el FastAPI del core.
 */
export function cloneCoreVoice(
  formData: FormData,
  supabaseUserId: string,
  init?: Omit<RequestInit, 'body'>,
): Promise<Response> {
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  headers.set('X-User-Id', supabaseUserId);
  return fiferCoreApiFetch(FIFER_CORE_ROUTES.voiceClone, {
    ...init,
    method: 'POST',
    headers,
    body: formData,
  });
}
