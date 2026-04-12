import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es-CL', 'en-US'],
  defaultLocale: 'es-CL',
  localePrefix: 'as-needed',
});

export type AppLocale = (typeof routing.locales)[number];
