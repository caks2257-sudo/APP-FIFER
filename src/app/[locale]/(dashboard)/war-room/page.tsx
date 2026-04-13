import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Wifi } from 'lucide-react';
import { redirect } from 'next/navigation';

import MinimalistContextChat from '@/components/core/MinimalistContextChat';
import { getIntegrationsStatus } from '@/engines/system-engine/env-manager';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

type WarRoomPageProps = {
  params: { locale: string };
};

const logos: Record<string, string> = {
  tasklet: 'TL',
  fintoc: 'FT',
  make: 'MK',
  langgraph: 'LG',
};

function getLatencyStyles(latencyMs: number): string {
  if (latencyMs === 0) {
    return 'text-[#94A3B8]';
  }
  if (latencyMs === -1 || latencyMs > 800) {
    return 'text-rose-300';
  }
  if (latencyMs < 300) {
    return 'text-emerald-300';
  }
  return 'text-amber-200';
}

function formatLatencyLabel(latencyMs: number, t: (key: string) => string): string {
  if (latencyMs === 0) {
    return t('latencyMock');
  }
  if (latencyMs < 0) {
    return t('latencyError');
  }
  return `~ ${latencyMs}ms`;
}

export default async function WarRoomPage({ params }: WarRoomPageProps) {
  setRequestLocale(params.locale);
  const t = await getTranslations('WarRoom');

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(`/${params.locale}/login`);
  }

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser || dbUser.role?.toLowerCase() !== 'admin') {
    redirect(`/${params.locale}/dashboard`);
  }

  const integrations = await getIntegrationsStatus();
  const liveCount = integrations.filter((item) => item.status === 'LIVE').length;
  const mockCount = integrations.length - liveCount;

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <MinimalistContextChat appContext="war-room" />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#F9FAFB]">
          {t('title')}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>
      </header>

      <section className="rounded-2xl border border-[#1E293B] bg-gradient-to-r from-[#0F172A] to-[#111827] p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#94A3B8]">{t('telemetryHeader')}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#F9FAFB]">
              {t('telemetrySummary', {
                live: liveCount,
                mock: mockCount,
                total: integrations.length,
              })}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
              {t('liveCountBadge', { count: liveCount })}
            </span>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
              {t('mockCountBadge', { count: mockCount })}
            </span>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {integrations.map((item) => {
          const isLive = item.status === 'LIVE';
          return (
            <article
              key={item.id}
              className="flex h-full flex-col gap-4 rounded-2xl border border-[#1E293B] bg-[#111827]/80 p-5 shadow-md backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#334155] bg-[#0A0F1E] text-xs font-semibold tracking-wide text-[#E2E8F0]">
                    {logos[item.id]}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F9FAFB]">{item.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-[#64748B]">{item.pillar}</p>
                  </div>
                </div>
                <span
                  className={
                    isLive
                      ? 'rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300'
                      : 'rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200'
                  }
                >
                  {isLive ? t('badgeLive') : t('badgeMock')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <Wifi className={`h-3.5 w-3.5 ${getLatencyStyles(item.latencyMs)}`} aria-hidden />
                <span className={`${getLatencyStyles(item.latencyMs)} font-medium`}>
                  {formatLatencyLabel(item.latencyMs, t)}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-[#CBD5E1]">{item.role}</p>

              {!isLive ? (
                <button
                  type="button"
                  disabled
                  className="mt-auto inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#334155] bg-[#0A0F1E]/60 px-4 py-2 text-sm font-medium text-[#94A3B8] opacity-75"
                >
                  {t('configureLocalKey')}
                </button>
              ) : (
                <div className="mt-auto rounded-lg border border-[#1E293B] bg-[#0A0F1E]/60 px-3 py-2 text-xs text-[#86EFAC]">
                  {t('serviceOperational')}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
