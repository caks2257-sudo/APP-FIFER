import { getTranslations } from 'next-intl/server';

export default async function RegularizacionesPage() {
  const t = await getTranslations('dom.regularizaciones');

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-4 text-2xl font-bold text-[#F9FAFB]">{t('title')}</h1>
      <p className="max-w-xl text-[#94A3B8]">{t('body')}</p>
    </div>
  );
}
