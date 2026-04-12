'use client';

import { useLocale } from 'next-intl';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { AppLocale } from '@/i18n/routing';

export type PreferredCurrency = 'CLP' | 'USD';

type LocalePreferencesValue = {
  locale: AppLocale;
  /** Preferencia de visualización UI; la moneda de datos sigue viniendo del backend. */
  currency: PreferredCurrency;
};

const LocalePreferencesContext = createContext<LocalePreferencesValue | null>(null);

function localeToPreferredCurrency(locale: string): PreferredCurrency {
  return locale === 'en-US' ? 'USD' : 'CLP';
}

export function LocalePreferencesProvider({ children }: { children: ReactNode }) {
  const locale = useLocale() as AppLocale;
  const value = useMemo(
    () => ({
      locale,
      currency: localeToPreferredCurrency(locale),
    }),
    [locale],
  );

  return (
    <LocalePreferencesContext.Provider value={value}>{children}</LocalePreferencesContext.Provider>
  );
}

/** Alias ADN (mismo componente que `LocalePreferencesProvider`). */
export const LocaleProvider = LocalePreferencesProvider;

export function useLocalePreferences() {
  const ctx = useContext(LocalePreferencesContext);
  if (!ctx) {
    throw new Error('useLocalePreferences must be used within LocalePreferencesProvider');
  }
  return ctx;
}
