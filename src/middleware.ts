import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

export default createMiddleware(routing);

/**
 * Un solo matcher (recomendado por next-intl): cubre `/`, `/es-CL`, `/en-US` y el resto.
 * Patrones tipo `/(es-CL|en-US)/…` en path-to-regexp pueden fallar con guiones en locale.
 */
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};