import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/supabase-database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Cliente público (anon): seguro para componentes cliente y servidor con RLS. */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

function createSupabaseAdmin(): SupabaseClient<Database> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está definida. Solo debe usarse en el servidor.',
    )
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

let adminSingleton: SupabaseClient<Database> | undefined

function getSupabaseAdminInstance(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'supabaseAdmin es solo servidor. Usa Route Handlers, Server Actions o componentes de servidor.',
    )
  }
  if (!adminSingleton) {
    adminSingleton = createSupabaseAdmin()
  }
  return adminSingleton
}

const browserAdminStub = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    throw new Error(
      `supabaseAdmin es solo servidor (acceso a "${String(prop)}"). Usa Route Handlers, Server Actions o componentes de servidor.`,
    )
  },
})

const serverAdminLazyProxy = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdminInstance()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

/**
 * Cliente con service role: bypass RLS. La instancia real solo se crea en el servidor
 * y solo al usar el cliente (no al importar el módulo). En el navegador, cualquier
 * acceso lanza error y la service role no se incluye en el bundle.
 */
export const supabaseAdmin: SupabaseClient<Database> =
  typeof window === 'undefined' ? serverAdminLazyProxy : browserAdminStub
