import { randomUUID } from 'node:crypto'

import { supabaseAdmin } from '@/lib/supabase'

import type { Database, Json } from '@/types/supabase-database'

export type FiferDocumentRow = Database['public']['Tables']['Document']['Row']

function buildUniqueObjectPath(ownerId: string, originalName: string): string {
  const trimmed = originalName.trim() || 'archivo'
  const ext = trimmed.includes('.')
    ? trimmed.slice(trimmed.lastIndexOf('.'))
    : ''
  const unique = `${Date.now()}-${randomUUID()}`
  return `${ownerId}/${unique}${ext}`
}

function resolveFileType(file: File): string {
  if (file.type && file.type.length > 0) {
    return file.type
  }
  const name = file.name
  if (name.includes('.')) {
    const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
    if (ext) {
      return `application/x-${ext}`
    }
  }
  return 'application/octet-stream'
}

/**
 * Sube un archivo a Supabase Storage y registra la fila en `Document`.
 * Usa `supabaseAdmin` (service role) en servidor: adecuado para buckets privados y políticas RLS.
 *
 * Si la subida a Storage falla, no se escribe en la base de datos.
 * Si el insert falla tras un upload exitoso, se intenta eliminar el objeto huérfano.
 */
export type UploadDocumentExtras = {
  subApp?: string | null
  metadata?: Json | null
}

export async function uploadFiferDocument(
  file: File,
  bucketName: string,
  ownerId: string,
  mainApp: string,
  extras?: UploadDocumentExtras,
): Promise<FiferDocumentRow> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'uploadFiferDocument solo puede ejecutarse en el servidor (Route Handler, Server Action, etc.).',
    )
  }

  const client = supabaseAdmin
  const bucketPath = buildUniqueObjectPath(ownerId, file.name)
  const contentType = resolveFileType(file)

  let uploadSucceeded = false

  try {
    const { error: uploadError } = await client.storage
      .from(bucketName)
      .upload(bucketPath, file, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(
        `[storage] Error al subir a "${bucketName}": ${uploadError.message}`,
      )
    }

    uploadSucceeded = true

    const {
      data: { publicUrl: fileUrl },
    } = client.storage.from(bucketName).getPublicUrl(bucketPath)

    const insertRow: Database['public']['Tables']['Document']['Insert'] = {
      name: file.name || bucketPath.split('/').pop() || 'archivo',
      fileUrl,
      fileType: contentType,
      size: file.size,
      bucketPath,
      mainApp,
      ownerId,
      ...(extras?.subApp != null ? { subApp: extras.subApp } : {}),
      ...(extras?.metadata != null ? { metadata: extras.metadata } : {}),
    }

    const { data: document, error: insertError } = await client
      .from('Document')
      .insert(insertRow)
      .select()
      .single()

    if (insertError) {
      throw new Error(
        `[storage] Error al insertar Document: ${insertError.message}`,
      )
    }

    if (!document) {
      throw new Error('[storage] Insert en Document no devolvió fila.')
    }

    return document
  } catch (err) {
    if (uploadSucceeded) {
      const { error: removeError } = await client.storage
        .from(bucketName)
        .remove([bucketPath])
      if (removeError) {
        console.error(
          '[storage] No se pudo revertir objeto tras fallo de DB:',
          removeError.message,
        )
      }
    }
    throw err
  }
}
