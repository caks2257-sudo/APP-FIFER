'use server'

import { resolveMockOwnerId } from '@/lib/resolve-mock-owner-id'
import {
  uploadFiferDocument,
  type FiferDocumentRow,
  type UploadDocumentExtras,
} from '@/lib/storage'

export type UploadDocumentActionResult = {
  success: boolean
  data?: FiferDocumentRow
  error?: string
}

export async function uploadDocumentAction(
  formData: FormData,
  mainApp: string,
  bucketName: string,
  extras?: UploadDocumentExtras,
): Promise<UploadDocumentActionResult> {
  try {
    const entry = formData.get('file')
    if (!entry || typeof entry === 'string') {
      return { success: false, error: 'No se recibió ningún archivo.' }
    }

    const file = entry as File
    if (file.size === 0) {
      return { success: false, error: 'El archivo está vacío.' }
    }

    const ownerId = await resolveMockOwnerId()
    const data = await uploadFiferDocument(file, bucketName, ownerId, mainApp, extras)

    return { success: true, data }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error desconocido al subir el documento.'
    return { success: false, error: message }
  }
}
