'use client';

import { useLocale } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="flex shrink-0 flex-wrap gap-1 rounded-lg border border-[#1E293B] bg-[#111827]/90 p-0.5 text-[11px] font-medium"
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => router.replace(pathname, { locale: loc })}
            className={`rounded-md px-2 py-1 transition ${
              active
                ? 'bg-[#EAB308]/20 text-[#EAB308]'
                : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F9FAFB]'
            }`}
          >
            {loc === 'es-CL' ? 'ES-CL' : 'EN-US'}
          </button>
        );
      })}
    </div>
  );
}
