import {
  FIFER_CORE_ROUTES,
  fiferCoreApiFetch,
} from '@/lib/fifer-core-api';

export type SupabaseUserSyncPayload = {
  supabase_id: string;
  email: string;
};

/**
 * POST `/api/v1/core/auth/sync` — replica el usuario de Supabase Auth en Postgres del core.
 */
export function syncSupabaseUserToCore(
  payload: SupabaseUserSyncPayload,
  init?: RequestInit,
): Promise<Response> {
  return fiferCoreApiFetch(FIFER_CORE_ROUTES.authSync, {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}
