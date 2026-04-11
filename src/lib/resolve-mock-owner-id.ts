import { supabaseAdmin } from '@/lib/supabase'

const SEED_FOUNDER_NAME = 'Cristobal Kupfer'

/**
 * Mock temporal hasta cerrar Auth: prioridad
 * 1) Usuario por `SEED_FOUNDER_EMAIL` o `FIFER_MOCK_UPLOAD_OWNER_EMAIL`
 * 2) Usuario con nombre de seed (Cristobal Kupfer)
 * 3) `FIFER_MOCK_OWNER_ID` (cuid fijo)
 */
export async function resolveMockOwnerId(): Promise<string> {
  const email =
    process.env.SEED_FOUNDER_EMAIL?.trim() ||
    process.env.FIFER_MOCK_UPLOAD_OWNER_EMAIL?.trim()

  if (email) {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('[resolveMockOwnerId] lookup User por email:', error.message)
    }
    if (data?.id) {
      return data.id
    }
  }

  const { data: byName, error: nameErr } = await supabaseAdmin
    .from('User')
    .select('id')
    .eq('name', SEED_FOUNDER_NAME)
    .maybeSingle()

  if (nameErr) {
    console.error('[resolveMockOwnerId] lookup User por nombre:', nameErr.message)
  }
  if (byName?.id) {
    return byName.id
  }

  const staticId = process.env.FIFER_MOCK_OWNER_ID?.trim()
  if (staticId) {
    return staticId
  }

  throw new Error(
    'No se pudo resolver ownerId: define SEED_FOUNDER_EMAIL o FIFER_MOCK_UPLOAD_OWNER_EMAIL (usuario en BD), o FIFER_MOCK_OWNER_ID. Tras `prisma db seed`, suele existir el usuario de prueba.',
  )
}
