'use client';

import type { Bot } from '@prisma/client';
import { useTranslations } from 'next-intl';

import { ApiKeyManager } from '@/components/fifer/ApiKeyManager';
import { DocumentUploader } from '@/components/fifer/DocumentUploader';
import FiferMisbotsMain from '@/components/v0-ingestion/boxes/FiferMisbotsMain';
import type { Database } from '@/types/supabase-database';

type BotTableRow = Database['public']['Tables']['Bot']['Row'];

type Props = {
  initialBots: Bot[];
  hasSession: boolean;
};

function mapPrismaToTableRow(b: Bot): BotTableRow {
  return {
    id: b.id,
    name: b.name,
    status: b.status,
    modelId: b.modelId,
    avatarUrl: b.avatarUrl,
    mainApp: b.mainApp,
    sourceApp: b.sourceApp,
    subApp: b.subApp,
    metadata: b.metadata,
    ownerId: b.ownerId,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export function MisbotsHubView({ initialBots, hasSession }: Props) {
  const t = useTranslations('bots.hub');
  const rows: BotTableRow[] = initialBots.map(mapPrismaToTableRow);

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <header className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h1>
        <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>
      </header>

      {!hasSession ? (
        <div
          className="rounded-xl border border-[#334155] bg-[#111827]/50 px-6 py-10 text-center"
          role="status"
        >
          <p className="text-base font-medium text-[#F9FAFB]">{t('noSessionTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{t('noSessionBody')}</p>
        </div>
      ) : null}

      {hasSession ? (
        <>
          <section
            className="rounded-xl border border-[#334155]/80 bg-[#0A0F1E]/60 px-4 py-5 md:px-6"
            aria-labelledby="misbots-doc-uploader-heading"
          >
            <h2
              id="misbots-doc-uploader-heading"
              className="mb-4 text-base font-semibold tracking-tight text-[#F9FAFB]"
            >
              {t('docSectionTitle')}
            </h2>
            <div className="max-w-2xl">
              <DocumentUploader mainApp="misbots" />
            </div>
          </section>
          <section className="mb-2" aria-label={t('apiKeysAria')}>
            <ApiKeyManager />
          </section>
          <FiferMisbotsMain data={{}} initialBots={rows} />
        </>
      ) : null}
    </div>
  );
}
