'use client';

import { Bot, Loader2 } from 'lucide-react';

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
};

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
}: BotCardProps) {
  return (
    <article
      className="flex flex-col gap-3 rounded-lg border border-[#1E293B] bg-[#0A0F1E]/60 p-4 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.08)]"
      aria-labelledby={`bot-card-title-${id}`}
    >
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
          <dt className="text-[#94A3B8]">Estado</dt>
          <dd className="font-data text-[#EAB308]">{status}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[#94A3B8]">Modelo</dt>
          <dd className="truncate font-mono text-xs text-[#CBD5E1]" title={modelId}>
            {modelId}
          </dd>
        </div>
        {typeof costoPromedioUF === 'number' ? (
          <div className="flex justify-between gap-2">
            <dt className="text-[#94A3B8]">Costo prom. UF</dt>
            <dd className="font-data text-[#EAB308]">{costoPromedioUF.toFixed(2)}</dd>
          </div>
        ) : null}
      </dl>
      {onGenerateAvatar || onTestNotify ? (
        <div className="flex flex-wrap gap-1.5 border-t border-[#1E293B] pt-3">
          {onGenerateAvatar ? (
            <button
              type="button"
              disabled={Boolean(disableGenerate)}
              title="Generar avatar"
              aria-label={`Generar avatar para ${name}`}
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
              title="Notificación de prueba al administrador (motor comms)"
              aria-label={`Enviar notificación de prueba para ${name}`}
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
