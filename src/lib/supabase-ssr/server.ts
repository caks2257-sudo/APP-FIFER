import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/supabase-database'

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 * La actualización de sesión en cookies la realiza principalmente `src/middleware.ts`.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // En Server Components no siempre se pueden escribir cookies; el middleware refresca la sesión.
          }
        },
      },
    },
  )
}
