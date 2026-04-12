'use client';

import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import BoxLoader from '@/components/core/BoxLoader';
import { SmartInsightWidget } from '@/components/core/SmartInsightWidget';
import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import BotCard from '@/components/v0-ingestion/boxes/BotCard';
import { useBoxData } from '@/hooks/useBoxData';
import { useUserDnaStore } from '@/store/useUserDnaStore';
import type { AppPreferences } from '@/types/user-dna';
import { BotDataSchema, type BotEstado, type BotRow } from '@/types/schemas';
import type { Database } from '@/types/supabase-database';
import { boxCircuitBreaker, subscribeBoxCircuitSnapshots } from '@/utils/box-circuit-breaker';
import { fetchRealBoxDataForBridge } from '@/utils/fifer-box-data-bridge';
import type { V0BoxProps } from '../box-types';

type BotTableRow = Database['public']['Tables']['Bot']['Row'];

export type FiferMisbotsMainProps = V0BoxProps & {
  /** Filas desde Supabase (`Bot`). Si está definido, no se usa el stub HTTP del bridge. */
  initialBots?: BotTableRow[];
};

function normalizeBotEstado(status: string): BotEstado {
  const s = status.trim().toLowerCase();
  if (s === 'error' || s === 'fallido' || s === 'failed') return 'error';
  if (s === 'pausado' || s === 'paused' || s === 'inactive' || s === 'stopped') return 'pausado';
  return 'activo';
}

function mapServerBotToBotRow(row: BotTableRow): BotRow {
  return {
    id: row.id,
    nombre: row.name,
    estado: normalizeBotEstado(row.status),
    modeloAsignado: row.modelId,
    costoPromedioUF: 0,
    avatarUrl: row.avatarUrl ?? undefined,
  };
}

type BotActionTarget = { id: string; name: string };

const BOX_CIRCUIT_ID = 'fifer-misbots-main' as const;

const GENERATE_AVATAR_PATH = '/api/v1/misbots/generate-avatar';
const TEST_COMMS_PATH = '/api/v1/misbots/test-comms';

/** Referencia estable para módulos sin prefs en `fractalDNA` (no usar `getAppPreferences` en selectores: devuelve copia nueva). */
const EMPTY_BOTS_PREFS: AppPreferences = {};

function defaultAvatarPrompt(bot: BotActionTarget): string {
  return `Retrato avatar cuadrado, ilustración limpia y profesional, asistente virtual "${bot.name}", paleta dorada y azul marino, rostro amable, fondo geométrico suave, legible en miniatura.`;
}

type GenerateAvatarOk = {
  ok: true;
  botId: string;
  imageUrl: string;
  provider?: string;
};

type GenerateAvatarErr = {
  ok: false;
  code: string;
  reason: string;
  botId?: string;
};

type TestCommsOk = {
  ok: true;
  botId: string;
  provider: 'whatsapp' | 'email';
  channel: string;
  detail?: string | null;
};

type TestCommsErr = {
  ok: false;
  code: string;
  reason: string;
};

function isUpgradeHintCode(code: string): boolean {
  return code === 'IMAGEGEN_EXHAUSTED';
}

type FiferMisbotsMainInnerProps = V0BoxProps & {
  onRequestHydrationRefetch: () => void;
  initialBots?: BotTableRow[];
};

function FiferMisbotsMainInner({ onRequestHydrationRefetch, initialBots }: FiferMisbotsMainInnerProps) {
  const t = useTranslations('bots.flota');
  const dna = useUserDnaStore((state) => state.fractalDNA.bots ?? EMPTY_BOTS_PREFS);
  const core = useUserDnaStore((state) => state.coreProfile);

  const [avatarByBotId, setAvatarByBotId] = useState<Record<string, string>>({});
  const [generatingBotId, setGeneratingBotId] = useState<string | null>(null);
  const [notifyingBotId, setNotifyingBotId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    kind: 'upgrade' | 'error' | 'info';
    message: string;
    /** Solo errores: distingue copy de avatar vs comms. */
    errorSource?: 'avatar' | 'comms';
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 7500);
    return () => window.clearTimeout(id);
  }, [toast]);

  /** Acción generativa: `fetch` dedicado (no `useBoxData`) para no disparar `boxCircuitBreaker` del box de carga. */
  const handleGenerateAvatar = useCallback(
    async (bot: BotActionTarget) => {
      setGeneratingBotId(bot.id);
      const prompt = defaultAvatarPrompt(bot);
      try {
        const res = await fetch(GENERATE_AVATAR_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: bot.id, prompt, core }),
        });
        const data = (await res.json()) as GenerateAvatarOk | GenerateAvatarErr;
        if (data.ok) {
          setAvatarByBotId((prev) => ({ ...prev, [data.botId]: data.imageUrl }));
          return;
        }
        if (isUpgradeHintCode(data.code) || res.status === 503) {
          setToast({
            kind: 'upgrade',
            message: t('toastUpgradeBody'),
          });
          return;
        }
        setToast({
          kind: 'error',
          errorSource: 'avatar',
          message: data.reason || t('toastAvatarErr'),
        });
      } catch {
        setToast({
          kind: 'error',
          errorSource: 'avatar',
          message: t('toastNoResponse'),
        });
      } finally {
        setGeneratingBotId(null);
      }
    },
    [core, t],
  );

  const handleTestNotify = useCallback(
    async (bot: BotActionTarget) => {
      setNotifyingBotId(bot.id);
      try {
        const res = await fetch(TEST_COMMS_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botId: bot.id,
            botNombre: bot.name,
            provider: 'email',
            core,
          }),
        });
        const data = (await res.json()) as TestCommsOk | TestCommsErr;
        if (data.ok) {
          setToast({
            kind: 'info',
            message: t('toastNotifyOk', {
              channel: data.channel,
              detail: data.detail ? `: ${data.detail}` : '',
            }),
          });
          return;
        }
        setToast({
          kind: 'error',
          errorSource: 'comms',
          message: data.reason || t('toastNotifyErr'),
        });
      } catch {
        setToast({
          kind: 'error',
          errorSource: 'comms',
          message: t('toastNoResponse'),
        });
      } finally {
        setNotifyingBotId(null);
      }
    },
    [core, t],
  );

  const circuitOpen = useSyncExternalStore(
    subscribeBoxCircuitSnapshots,
    () => boxCircuitBreaker.isCircuitOpen(BOX_CIRCUIT_ID),
    () => false,
  );

  const misbotsFetcher = useCallback(async () => {
    if (initialBots !== undefined) {
      const bots = initialBots.map(mapServerBotToBotRow);
      return BotDataSchema.parse({ bots, degraded: false });
    }
    if (boxCircuitBreaker.isCircuitOpen(BOX_CIRCUIT_ID)) {
      return BotDataSchema.parse({ bots: [], degraded: false });
    }
    const raw = await fetchRealBoxDataForBridge('fiferMisbotsMain');
    const parsed = BotDataSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error('BotDataSchema inválido tras bridge');
    }
    return parsed.data;
  }, [initialBots]);

  const { data, isLoading, error } = useBoxData('fifer-misbots-main', misbotsFetcher);

  const boxData = useMemo(() => {
    const botsSlice = data?.bots ?? [];
    const degradedSlice = Boolean(data?.degraded);
    const degradedMessageSlice = String(data?.errorMessage ?? '');
    if (circuitOpen) {
      return { dna, circuitOpen: true };
    }
    const o: Record<string, unknown> =
      botsSlice.length > 0 || degradedSlice
        ? { dna, bots: botsSlice, degraded: degradedSlice, errorMessage: degradedMessageSlice }
        : { dna };
    return o;
  }, [circuitOpen, data, dna]);

  const bots = useMemo(() => data?.bots ?? [], [data]);

  const botsForInsight = useMemo(
    () =>
      bots.map((b) => ({
        ...b,
        avatarUrl: avatarByBotId[b.id] ?? b.avatarUrl,
      })),
    [bots, avatarByBotId],
  );
  const degraded = Boolean(data?.degraded);
  const degradedMessage = String(data?.errorMessage ?? '');

  if (!circuitOpen && isLoading) {
    return (
      <BoxLoader module="bots" isLoading>
        {null}
      </BoxLoader>
    );
  }

  if (!circuitOpen && error) {
    throw error;
  }

  return (
    <BaseBoxTemplate
      config={{ title: t('boxTitle') }}
      data={boxData}
      isLoading={false}
      isRefining={false}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[#EAB308]" aria-hidden />
          <p className="text-lg font-semibold text-[#F9FAFB]">{t('heading')}</p>
        </div>
        <p className="text-sm text-[#94A3B8]">
          {t('greeting', { name: core.nombres })}{' '}
          <span className="font-medium text-[#EAB308]">{core.tier ?? t('tierUnknown')}</span>
        </p>

        {circuitOpen ? (
          <p className="rounded-lg border border-red-500/35 bg-[#0A0F1E]/90 p-4 text-sm text-red-200">
            {t('circuitOpen', { id: BOX_CIRCUIT_ID })}
            <button
              type="button"
              className="ml-3 rounded border border-[#EAB308]/40 px-2 py-1 text-xs text-[#EAB308] hover:bg-[#EAB308]/10"
              onClick={() => {
                boxCircuitBreaker.reset(BOX_CIRCUIT_ID);
                onRequestHydrationRefetch();
              }}
            >
              {t('retry')}
            </button>
          </p>
        ) : null}

        {degraded && !bots.length ? (
          <p className="rounded-lg border border-[#EAB308]/35 bg-[#0A0F1E]/90 p-4 text-sm text-[#EAB308]">
            {degradedMessage || t('degradedFallback')}
          </p>
        ) : null}

        {bots.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {initialBots !== undefined
                ? initialBots.map((row) => (
                    <BotCard
                      key={row.id}
                      id={row.id}
                      name={row.name}
                      status={row.status}
                      modelId={row.modelId}
                      avatarSrc={avatarByBotId[row.id] ?? row.avatarUrl}
                      generatingAvatar={generatingBotId === row.id}
                      notifying={notifyingBotId === row.id}
                      disableGenerate={Boolean(generatingBotId)}
                      disableNotify={Boolean(generatingBotId) || Boolean(notifyingBotId)}
                      onGenerateAvatar={() => handleGenerateAvatar({ id: row.id, name: row.name })}
                      onTestNotify={() => handleTestNotify({ id: row.id, name: row.name })}
                      configHref={`/misbots/${row.id}/config`}
                    />
                  ))
                : bots.map((b) => (
                    <BotCard
                      key={b.id}
                      id={b.id}
                      name={b.nombre}
                      status={b.estado}
                      modelId={b.modeloAsignado}
                      avatarSrc={avatarByBotId[b.id] ?? b.avatarUrl}
                      costoPromedioUF={b.costoPromedioUF}
                      generatingAvatar={generatingBotId === b.id}
                      notifying={notifyingBotId === b.id}
                      disableGenerate={Boolean(generatingBotId)}
                      disableNotify={Boolean(generatingBotId) || Boolean(notifyingBotId)}
                      onGenerateAvatar={() => handleGenerateAvatar({ id: b.id, name: b.nombre })}
                      onTestNotify={() => handleTestNotify({ id: b.id, name: b.nombre })}
                      configHref={`/misbots/${b.id}/config`}
                    />
                  ))}
            </div>
            <div className="pt-1">
              <SmartInsightWidget
                moduleId="bots"
                boxId="fifer-misbots-main"
                contextData={{ bots: botsForInsight, preferencias: dna }}
                systemInstruction={t('insightInstruction')}
              />
            </div>
          </div>
        ) : !degraded && !circuitOpen ? (
          <div className="rounded-lg border border-[#334155] bg-[#0A0F1E]/80 p-6 text-center">
            <p className="text-base font-medium text-[#F9FAFB]">{t('emptyTitle')}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{t('emptyBody')}</p>
          </div>
        ) : null}

        {toast ? (
          <div
            role="status"
            className={
              toast.kind === 'upgrade'
                ? 'fixed bottom-6 right-6 z-[80] max-w-sm rounded-xl border border-[#EAB308]/45 bg-[#0F172A]/95 p-4 text-sm text-[#F8FAFC] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur'
                : toast.kind === 'info'
                  ? 'fixed bottom-6 right-6 z-[80] max-w-sm rounded-xl border border-sky-500/40 bg-[#0F172A]/95 p-4 text-sm text-sky-50 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur'
                  : 'fixed bottom-6 right-6 z-[80] max-w-sm rounded-xl border border-red-500/35 bg-[#0F172A]/95 p-4 text-sm text-red-100 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur'
            }
          >
            <p className="font-medium text-[#EAB308]">
              {toast.kind === 'upgrade'
                ? t('toastUpgradeTitle')
                : toast.kind === 'info'
                  ? t('toastCommsTitle')
                  : toast.errorSource === 'comms'
                    ? t('toastNotifyErrTitle')
                    : t('toastAvatarErrTitle')}
            </p>
            <p className="mt-2 leading-relaxed text-[#CBD5E1]">{toast.message}</p>
            {toast.kind === 'upgrade' ? (
              <p className="mt-2 text-xs text-[#94A3B8]">{t('toastUpgradeHint')}</p>
            ) : null}
            <button
              type="button"
              className="mt-3 text-xs font-medium text-[#EAB308] underline-offset-2 hover:underline"
              onClick={() => setToast(null)}
            >
              {t('close')}
            </button>
          </div>
        ) : null}
      </div>
    </BaseBoxTemplate>
  );
}

/**
 * Box ADN `fifer-misbots-main` — slot principal `/misbots` (variante Hero en plano UI).
 */
export default function FiferMisbotsMain(props: FiferMisbotsMainProps) {
  const [hydrationEpoch, setHydrationEpoch] = useState(0);
  const onRequestHydrationRefetch = useCallback(() => {
    setHydrationEpoch((e) => e + 1);
  }, []);

  return (
    <div id="fifer-misbots-main" className="h-full min-h-0 w-full">
      <BoxErrorBoundary>
        <FiferMisbotsMainInner
          key={hydrationEpoch}
          {...props}
          onRequestHydrationRefetch={onRequestHydrationRefetch}
        />
      </BoxErrorBoundary>
    </div>
  );
}
