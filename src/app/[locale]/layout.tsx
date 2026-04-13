import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import HtmlLangSetter from '@/components/core/HtmlLangSetter';
import { routing, type AppLocale } from '@/i18n/routing';
import { LocalePreferencesProvider } from '@/providers/LocalePreferencesProvider';

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocalePreferencesProvider>
        <HtmlLangSetter />
        {children}
      </LocalePreferencesProvider>
    </NextIntlClientProvider>
  );
}
