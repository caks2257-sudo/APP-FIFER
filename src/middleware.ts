import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/types/supabase-database'

/**
 * Rutas del hub de trabajo (prefijos). Un path coincide si es exactamente el prefijo
 * o un subpath (`/prefijo/...`). No usar `startsWith` suelto para evitar que `/dashboard`
 * absorba `/dashboardinmobiliario`.
 */
const HUB_PRIVATE_PREFIXES = [
  '/dashboard',
  /** DOM (normativa, recepción, etc.) — ruta canónica v6 `/dom/...` bajo `(dashboard)`. */
  '/dom',
  '/contratos',
  '/misbots',
  '/desarrollador',
  '/dashboardinmobiliario',
  /** App Finanzas: ruta canónica `/finanzas` bajo el grupo `(dashboard)`. */
  '/finanzas',
  /** App Afiliados: ruta canónica `/afiliados` bajo el grupo `(dashboard)`. */
  '/afiliados',
] as const

function isHubPrivateRoute(pathname: string): boolean {
  return HUB_PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const requiresAuth = isHubPrivateRoute(path)

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    if (nextPath && nextPath !== '/login') {
      url.searchParams.set('next', nextPath)
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
