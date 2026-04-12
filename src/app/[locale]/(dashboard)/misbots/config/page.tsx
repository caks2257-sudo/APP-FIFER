import { getTranslations } from 'next-intl/server';

import '@/engines/bot-engine';
import type { BotEngine } from '@/engines/bot-engine';
import { mapBotStatusToEstado } from '@/engines/bot-engine';
import { Link } from '@/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';

export default async function MisbotsConfigPickerPage() {
  const t = await getTranslations('bots.configPicker');
  const tHub = await getTranslations('bots.hub');
  const tStatus = await getTranslations('bots.status');

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let bots: { id: string; name: string; statusLabel: string }[] = [];
  if (user) {
    const engine = EngineRegistry.use<BotEngine>('bot-engine');
    const rows = await engine.getUserBots(user.id);
    bots = rows.map((b) => {
      const e = mapBotStatusToEstado(b.status);
      const statusLabel =
        e === 'error' ? tStatus('error') : e === 'pausado' ? tStatus('paused') : tStatus('active');
      return { id: b.id, name: b.name, statusLabel };
    });
  }

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <header className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h1>
        <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>
      </header>

      <p>
        <Link
          href="/misbots"
          className="text-sm font-medium text-[#EAB308] underline-offset-2 hover:underline"
        >
          {t('backHub')}
        </Link>
      </p>

      {!user ? (
        <div
          className="rounded-xl border border-[#334155] bg-[#111827]/50 px-6 py-10 text-center"
          role="status"
        >
          <p className="text-base font-medium text-[#F9FAFB]">{tHub('noSessionTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{tHub('noSessionBody')}</p>
        </div>
      ) : bots.length === 0 ? (
        <div className="rounded-xl border border-[#334155] bg-[#0A0F1E]/60 px-6 py-10 text-center text-[#94A3B8]">
          {t('empty')}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((b) => (
            <li key={b.id}>
              <Link
                href={`/misbots/${b.id}/config`}
                className="flex flex-col gap-2 rounded-xl border border-[#1E293B] bg-[#0A0F1E]/80 p-4 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.08)] transition hover:border-[#EAB308]/35"
              >
                <span className="text-sm font-semibold text-[#F9FAFB]">{b.name}</span>
                <span className="text-xs uppercase tracking-wide text-[#94A3B8]">{b.statusLabel}</span>
                <span className="font-mono text-[11px] text-[#64748B]">{b.id}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
