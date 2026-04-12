'use client';

import { Bot, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export type BotCardProps = {
  id: string;
  /** Campo `name` de la tabla Bot (Supabase). */
  name: string;
  /** Campo `status` de la tabla Bot. */
  status: string;
  /** Campo `modelId` de la tabla Bot. */
  modelId: string;
  avatarSrc?: string | null;
  costoPromedioUF?: number;
  generatingAvatar?: boolean;
  notifying?: boolean;
  /** Desactiva generar en todas las tarjetas mientras `generatingBotId` global está activo. */
  disableGenerate?: boolean;
  /** Desactiva notificar mientras hay generación o cualquier notificación en curso. */
  disableNotify?: boolean;
  onGenerateAvatar?: () => void;
  onTestNotify?: () => void;
  /** Spoke: enlace a configuración del bot (Hub & Spoke). */
  configHref?: string;
};

function statusTone(status: string): 'ok' | 'paused' | 'err' {
  const s = status.trim().toLowerCase();
  if (s === 'error' || s === 'fallido' || s === 'failed') return 'err';
  if (s === 'pausado' || s === 'paused' || s === 'inactive' || s === 'stopped') return 'paused';
  return 'ok';
}

/**
 * Tarjeta de bot alineada con columnas reales de BD: `name`, `status`, `modelId`.
 */
export default function BotCard({
  id,
  name,
  status,
  modelId,
  avatarSrc,
  costoPromedioUF,
  generatingAvatar,
  notifying,
  disableGenerate,
  disableNotify,
  onGenerateAvatar,
  onTestNotify,
  configHref,
}: BotCardProps) {
  const t = useTranslations('bots.card');
  const tStatus = useTranslations('bots.status');
  const tone = statusTone(status);
  const badgeClass =
    tone === 'err'
      ? 'border-red-500/40 bg-red-950/40 text-red-200'
      : tone === 'paused'
        ? 'border-amber-500/35 bg-amber-950/30 text-amber-200'
        : 'border-emerald-500/35 bg-emerald-950/25 text-emerald-200';

  return (
    <article
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#1E293B] bg-[#0A0F1E]/80 p-4 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.08)]"
      aria-labelledby={`bot-card-title-${id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}
        >
          {tone === 'err'
            ? tStatus('error')
            : tone === 'paused'
              ? tStatus('paused')
              : tStatus('active')}
        </span>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#334155] bg-[#0F172A]">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              src={avatarSrc}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Bot className="h-6 w-6 text-[#64748B]" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 id={`bot-card-title-${id}`} className="truncate text-base font-semibold text-[#F9FAFB]">
            {name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-[#94A3B8]">{id}</p>
        </div>
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-2 border-t border-[#1E293B] pt-2">
          <dt className="text-[#94A3B8]">{t('state')}</dt>
          <dd className="font-data max-w-[55%] truncate text-right text-[#EAB308]" title={status}>
            {status}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[#94A3B8]">{t('model')}</dt>
          <dd className="truncate font-mono text-xs text-[#CBD5E1]" title={modelId}>
            {modelId}
          </dd>
        </div>
        {typeof costoPromedioUF === 'number' ? (
          <div className="flex justify-between gap-2">
            <dt className="text-[#94A3B8]">{t('avgCostUf')}</dt>
            <dd className="font-data text-[#EAB308]">{costoPromedioUF.toFixed(2)}</dd>
          </div>
        ) : null}
      </dl>
      {configHref ? (
        <div className="border-t border-[#1E293B] pt-3">
          <Link
            href={configHref}
            className="text-sm font-semibold text-[#EAB308] underline-offset-4 hover:underline"
          >
            {t('openConfig')}
          </Link>
        </div>
      ) : null}
      {onGenerateAvatar || onTestNotify ? (
        <div className="flex flex-wrap gap-1.5 border-t border-[#1E293B] pt-3">
          {onGenerateAvatar ? (
            <button
              type="button"
              disabled={Boolean(disableGenerate)}
              title={t('genAvatarTitle')}
              aria-label={t('genAvatarAria', { name })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#EAB308]/35 text-base text-[#EAB308] transition hover:bg-[#EAB308]/15 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onGenerateAvatar}
            >
              {generatingAvatar ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <>🎨</>}
            </button>
          ) : null}
          {onTestNotify ? (
            <button
              type="button"
              disabled={Boolean(disableNotify)}
              title={t('testNotifyTitle')}
              aria-label={t('testNotifyAria', { name })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-sky-500/35 text-base text-sky-300 transition hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onTestNotify}
            >
              {notifying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <>🔔</>}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
