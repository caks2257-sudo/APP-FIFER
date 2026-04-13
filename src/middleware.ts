import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Coincide con la raíz (/) y todas las rutas bajo /[locale]
  // Ignora las rutas de API, _next, y archivos estáticos
  matcher: ['/', '/(es-CL|en-US)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};