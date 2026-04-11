'use server'

import {
  generateInternalKey,
  type InternalApiKeyScope,
} from '@/lib/api-manager'
import { resolveMockOwnerId } from '@/lib/resolve-mock-owner-id'
import { supabaseAdmin } from '@/lib/supabase'

export type ApiKeyListItem = {
  id: string
  name: string
  /** Prefijo enmascarado; nunca el secreto completo. */
  keyPreview: string
  scope: InternalApiKeyScope
  targetAppOrEngine: string
  createdAt: string
}

export type CreateApiKeyActionParams = {
  targetAppOrEngine: string
  scope: InternalApiKeyScope
  name?: string
}

export type CreateApiKeyActionResult =
  | { success: true; id: string; apiKey: string }
  | { success: false; error: string }

function maskStoredKey(secret: string): string {
  const s = secret.trim()
  if (s.length <= 12) {
    return '••••••••'
  }
  return `${s.slice(0, 12)}…`
}

export type GetApiKeysActionResult =
  | { success: true; keys: ApiKeyListItem[] }
  | { success: false; error: string }

export async function getApiKeysAction(): Promise<GetApiKeysActionResult> {
  let ownerId: string
  try {
    ownerId = await resolveMockOwnerId()
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'No se pudo resolver el propietario (owner).'
    return { success: false, error: message }
  }

  const { data, error } = await supabaseAdmin
    .from('InternalApiKey')
    .select('id, name, apiKey, scope, targetAppOrEngine, createdAt')
    .eq('ownerId', ownerId)
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('[getApiKeysAction]', error.message)
    return { success: false, error: error.message }
  }

  const rows = data ?? []
  const keys: ApiKeyListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    keyPreview: maskStoredKey(row.apiKey),
    scope: row.scope as InternalApiKeyScope,
    targetAppOrEngine: row.targetAppOrEngine,
    createdAt: row.createdAt,
  }))

  return { success: true, keys }
}

export async function createApiKeyAction(
  params: CreateApiKeyActionParams,
): Promise<CreateApiKeyActionResult> {
  try {
    const target = params.targetAppOrEngine?.trim()
    if (!target) {
      return { success: false, error: 'Indica un destino (motor o app).' }
    }

    const scope: InternalApiKeyScope =
      params.scope === 'FULL_ACCESS' ? 'FULL_ACCESS' : 'READ_ONLY'

    const ownerId = await resolveMockOwnerId()
    const name =
      params.name?.trim() ||
      `Llave · ${target} · ${new Date().toISOString().slice(0, 10)}`

    const { id, apiKey } = await generateInternalKey({
      ownerId,
      targetAppOrEngine: target,
      name,
      scope,
    })

    return { success: true, id, apiKey }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'No se pudo crear la llave interna.'
    return { success: false, error: message }
  }
}
