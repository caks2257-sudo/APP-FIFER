'use client';

import { Bell, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import LocaleSwitcher from '@/components/dashboard/LocaleSwitcher';

export default function Topbar() {
  const t = useTranslations('topbar');

  return (
    <header className="fixed left-64 right-0 top-0 z-50 flex h-20 min-h-[5rem] items-center justify-between gap-4 border-b border-[#1E293B] bg-[#0A0F1E]/90 px-6 backdrop-blur-sm sm:px-8">
      <div className="min-w-0 shrink">
        <p className="text-sm text-[#9CA3AF]">{t('panelLabel')}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3 sm:gap-4">
        <LocaleSwitcher />
        <div className="relative min-w-0 max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-full min-w-0 rounded-xl border border-[#1E293B] bg-[#111827] py-2.5 pl-9 pr-16 text-sm text-[#F9FAFB] placeholder-[#9CA3AF] focus:border-[#EAB308]/50 focus:outline-none"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-[#1E293B] px-2 py-0.5 text-xs text-[#9CA3AF] sm:inline-block">
            {t('kbdSearch')}
          </kbd>
        </div>

        <button
          type="button"
          className="relative shrink-0 rounded-lg p-2 text-[#9CA3AF] transition-all hover:bg-[#1E293B] hover:text-[#F9FAFB]"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EAB308]" />
        </button>
      </div>
    </header>
  );
}
