import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import '@/engines/bot-engine';
import type { BotEngine } from '@/engines/bot-engine';
import { mapBotStatusToEstado } from '@/engines/bot-engine';
import { Link } from '@/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function MisbotsBotConfigSpokePage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);
  const t = await getTranslations('bots.configSpoke');
  const tHub = await getTranslations('bots.hub');
  const tStatus = await getTranslations('bots.status');
  const tCard = await getTranslations('bots.card');

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex w-full flex-col gap-6 pb-10">
        <div
          className="rounded-xl border border-[#334155] bg-[#111827]/50 px-6 py-10 text-center"
          role="status"
        >
          <p className="text-base font-medium text-[#F9FAFB]">{tHub('noSessionTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{tHub('noSessionBody')}</p>
        </div>
        <p>
          <Link
            href="/misbots/config"
            className="text-sm font-medium text-[#EAB308] underline-offset-2 hover:underline"
          >
            {t('back')}
          </Link>
        </p>
      </div>
    );
  }

  const engine = EngineRegistry.use<BotEngine>('bot-engine');
  const bot = await engine.getBotDetails(id, user.id);
  if (!bot) {
    notFound();
  }

  const estado = mapBotStatusToEstado(bot.status);
  const statusLabel =
    estado === 'error'
      ? tStatus('error')
      : estado === 'pausado'
        ? tStatus('paused')
        : tStatus('active');

  const metadataStr =
    bot.metadata == null
      ? '—'
      : typeof bot.metadata === 'string'
        ? bot.metadata
        : JSON.stringify(bot.metadata, null, 2);

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <header className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h1>
        <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>
      </header>

      <p>
        <Link
          href="/misbots/config"
          className="text-sm font-medium text-[#EAB308] underline-offset-2 hover:underline"
        >
          {t('back')}
        </Link>
      </p>

      <article className="max-w-2xl space-y-6 rounded-xl border border-[#1E293B] bg-[#0A0F1E]/80 p-6 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.08)]">
        <div>
          <h2 className="text-lg font-semibold text-[#F9FAFB]">{bot.name}</h2>
          <p className="font-mono text-xs text-[#64748B]">{bot.id}</p>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              {tCard('state')}
            </dt>
            <dd className="mt-1 text-[#E2E8F0]">{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              {tCard('model')}
            </dt>
            <dd className="mt-1 font-mono text-[#E2E8F0]">{bot.modelId}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              {t('owner')}
            </dt>
            <dd className="mt-1 font-mono text-xs text-[#E2E8F0]">{bot.ownerId}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              {t('mainApp')}
            </dt>
            <dd className="mt-1 text-[#E2E8F0]">{bot.mainApp}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              {t('updated')}
            </dt>
            <dd className="mt-1 text-[#E2E8F0]">
              {new Date(bot.updatedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </dd>
          </div>
        </dl>

        {bot.subApp ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{t('subApp')}</p>
            <p className="mt-1 font-mono text-sm text-[#E2E8F0]">{bot.subApp}</p>
          </div>
        ) : null}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{t('metadata')}</p>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-[#334155] bg-[#020617]/80 p-3 text-xs text-[#CBD5E1]">
            {metadataStr}
          </pre>
        </div>
      </article>
    </div>
  );
}
