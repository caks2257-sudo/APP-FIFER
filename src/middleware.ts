import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';
import type { Database } from '@/types/supabase-database';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Rutas del hub de trabajo (prefijos). Un path coincide si es exactamente el prefijo
 * o un subpath (`/prefijo/...`). Se evalúa sobre el pathname sin prefijo de locale (`/en-US/...` → `...`).
 */
const HUB_PRIVATE_PREFIXES = [
  '/dashboard',
  '/dom',
  '/contratos',
  '/misbots',
  '/desarrollador',
  '/dashboardinmobiliario',
  '/finanzas',
  '/afiliados',
] as const;

function stripLocalePrefix(pathname: string): string {
  if (pathname.startsWith('/en-US/')) {
    return pathname.slice('/en-US'.length);
  }
  if (pathname === '/en-US') {
    return '/';
  }
  return pathname;
}

function isHubPrivateRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return HUB_PRIVATE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function loginPathForRequest(pathname: string): string {
  return pathname.startsWith('/en-US') ? '/en-US/login' : '/login';
}

function isBareLoginPath(pathname: string): boolean {
  return stripLocalePrefix(pathname) === '/login';
}

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const requiresAuth = isHubPrivateRoute(path);

  if (!user && requiresAuth && !isBareLoginPath(path)) {
    const url = request.nextUrl.clone();
    url.pathname = loginPathForRequest(path);
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (nextPath && !isBareLoginPath(request.nextUrl.pathname)) {
      url.searchParams.set('next', nextPath);
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
