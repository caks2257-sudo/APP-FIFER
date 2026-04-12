'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/** Sincroniza `<html lang>` con el locale activo (next-intl). */
export default function HtmlLangSetter() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
