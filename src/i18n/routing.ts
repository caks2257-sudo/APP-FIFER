import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en-US', 'es-CL'] as const,
  defaultLocale: 'es-CL',
  /** Siempre prefijo en URL (`/es-CL`, `/en-US`) para que coincidan rutas y middleware. */
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];