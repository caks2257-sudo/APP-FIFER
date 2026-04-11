import { randomBytes } from 'node:crypto'

import { supabaseAdmin } from '@/lib/supabase'

/** Alineado con `InternalApiKeyScope` en `prisma/schema.prisma` y `internal_api_key_scope` en Postgres. */
export type InternalApiKeyScope = 'READ_ONLY' | 'FULL_ACCESS'

export type GenerateInternalKeyParams = {
  ownerId: string
  targetAppOrEngine: string
  name: string
  scope?: InternalApiKeyScope
}

export type GenerateInternalKeyResult = {
  id: string
  /** Secreto en claro: solo en esta respuesta; guardar de forma segura y no volver a exponer. */
  apiKey: string
}

export type ValidateInternalRequestSuccess = {
  ok: true
  keyId: string
  ownerId: string
  scope: InternalApiKeyScope
  targetAppOrEngine: string
  name: string
}

export type ValidateInternalRequestFailure = {
  ok: false
  reason:
    | 'MISSING_KEY'
    | 'NOT_FOUND'
    | 'TARGET_MISMATCH'
    | 'INSUFFICIENT_SCOPE'
}

export type ValidateInternalRequestResult =
  | ValidateInternalRequestSuccess
  | ValidateInternalRequestFailure

function scopeSatisfies(
  keyScope: InternalApiKeyScope,
  requiredScope: InternalApiKeyScope,
): boolean {
  if (requiredScope === 'READ_ONLY') {
    return keyScope === 'READ_ONLY' || keyScope === 'FULL_ACCESS'
  }
  return keyScope === 'FULL_ACCESS'
}

function newInternalApiSecret(): string {
  const suffix = randomBytes(24).toString('base64url')
  return `fifer_iak_${suffix}`
}

function traceValidatedKey(payload: {
  keyId: string
  ownerId: string
  targetAppOrEngine: string
  scope: InternalApiKeyScope
}): void {
  console.info(
    '[InternalApiManager]',
    JSON.stringify({
      event: 'internal_key_validated',
      keyId: payload.keyId,
      ownerId: payload.ownerId,
      targetAppOrEngine: payload.targetAppOrEngine,
      scope: payload.scope,
      at: new Date().toISOString(),
    }),
  )
}

/**
 * Crea una fila en `InternalApiKey` para un tenant (`ownerId`) y un destino (`targetAppOrEngine`).
 * Solo servidor (usa `supabaseAdmin`).
 */
export async function generateInternalKey(
  params: GenerateInternalKeyParams,
): Promise<GenerateInternalKeyResult> {
  const apiKey = newInternalApiSecret()
  const scope = params.scope ?? 'READ_ONLY'

  const { data, error } = await supabaseAdmin
    .from('InternalApiKey')
    .insert({
      name: params.name,
      apiKey,
      scope,
      targetAppOrEngine: params.targetAppOrEngine,
      ownerId: params.ownerId,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(
      error?.message ?? 'No se pudo crear InternalApiKey en la base de datos.',
    )
  }

  return { id: data.id, apiKey }
}

/**
 * Valida una llave contra la tabla `InternalApiKey` para el motor llamado (`calleeTargetAppOrEngine`).
 * En éxito devuelve `ownerId` y metadatos no secretos para trazabilidad (ADN multi-tenant).
 */
export async function validateInternalRequest(
  apiKey: string | null | undefined,
  requiredScope: InternalApiKeyScope,
  calleeTargetAppOrEngine: string,
): Promise<ValidateInternalRequestResult> {
  const trimmed = apiKey?.trim()
  if (!trimmed) {
    return { ok: false, reason: 'MISSING_KEY' }
  }

  const { data, error } = await supabaseAdmin
    .from('InternalApiKey')
    .select('id, scope, targetAppOrEngine, ownerId, name')
    .eq('apiKey', trimmed)
    .maybeSingle()

  if (error) {
    console.error('[InternalApiManager] validateInternalRequest:', error.message)
    return { ok: false, reason: 'NOT_FOUND' }
  }

  if (!data) {
    return { ok: false, reason: 'NOT_FOUND' }
  }

  if (data.targetAppOrEngine !== calleeTargetAppOrEngine) {
    return { ok: false, reason: 'TARGET_MISMATCH' }
  }

  if (!scopeSatisfies(data.scope, requiredScope)) {
    return { ok: false, reason: 'INSUFFICIENT_SCOPE' }
  }

  traceValidatedKey({
    keyId: data.id,
    ownerId: data.ownerId,
    targetAppOrEngine: data.targetAppOrEngine,
    scope: data.scope,
  })

  return {
    ok: true,
    keyId: data.id,
    ownerId: data.ownerId,
    scope: data.scope,
    targetAppOrEngine: data.targetAppOrEngine,
    name: data.name,
  }
}

/** Facade opcional para quien prefiera un objeto único “motor de comunicación”. */
export const InternalApiManager = {
  generateInternalKey,
  validateInternalRequest,
} as const
