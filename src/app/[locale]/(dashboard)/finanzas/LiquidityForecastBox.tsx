'use client';

import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';

import type { CashflowLiquidityOutput } from '@/types/forecast-liquidity';
import { boxCircuitBreaker, subscribeBoxCircuitSnapshots } from '@/utils/box-circuit-breaker';

import { formatMoneyAmount } from './formatMoney';
import { LIQUIDITY_FORECAST_BOX_CIRCUIT_ID } from './useLiquidityForecast';

type Props = {
  data: CashflowLiquidityOutput | null;
  loading: boolean;
  error: string | null;
};

function SkeletonBlock() {
  return (
    <div className="space-y-4" aria-busy aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded bg-[#1E293B]" />
      <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-[#1E293B]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-16 animate-pulse rounded-lg bg-[#1E293B]" />
        <div className="h-16 animate-pulse rounded-lg bg-[#1E293B]" />
      </div>
    </div>
  );
}

export default function LiquidityForecastBox({ data, loading, error }: Props) {
  const t = useTranslations('finanzas.liquidity');
  const circuitOpen = useSyncExternalStore(
    subscribeBoxCircuitSnapshots,
    () => boxCircuitBreaker.isCircuitOpen(LIQUIDITY_FORECAST_BOX_CIRCUIT_ID),
    () => false,
  );

  if (circuitOpen) {
    return (
      <section
        className="rounded-xl border border-red-500/35 bg-[#0A0F1E] p-6 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]"
        aria-labelledby="liquidity-forecast-circuit-heading"
      >
        <h2
          id="liquidity-forecast-circuit-heading"
          className="text-sm font-semibold uppercase tracking-[0.14em] text-[#F87171]"
        >
          {t('circuitTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">{t('circuitBody')}</p>
        <p className="mt-2 text-xs text-[#64748B]">
          {t('circuitId', { id: LIQUIDITY_FORECAST_BOX_CIRCUIT_ID })}
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-[#1E293B] bg-[#0A0F1E] p-6 shadow-[0_0_0_1px_rgba(30,41,59,0.5)]"
      aria-labelledby="liquidity-forecast-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="liquidity-forecast-heading"
          className="text-sm font-semibold uppercase tracking-[0.14em] text-[#EAB308]"
        >
          {t('title')}
        </h2>
        <p className="text-xs text-[#64748B]">{t('engineHint')}</p>
      </div>

      {error && (
        <div
          className="mt-4 rounded-lg border border-amber-500/35 bg-[#111827] px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {error}
        </div>
      )}

      {!error && loading && (
        <div className="mt-4">
          <SkeletonBlock />
        </div>
      )}

      {!error && !loading && data?.status === 'insufficient_data' && (
        <div className="mt-4 rounded-lg border border-[#334155] bg-[#111827]/80 px-4 py-5">
          <p className="text-sm font-medium text-[#F9FAFB]">{t('insufficientTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{data.reason}</p>
          <dl className="mt-4 grid gap-2 text-xs text-[#64748B] sm:grid-cols-2">
            <div>
              <dt className="font-medium text-[#94A3B8]">{t('observedTx')}</dt>
              <dd className="font-mono tabular-nums text-[#CBD5E1]">
                {data.observed.transactionCount}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[#94A3B8]">{t('gapDays')}</dt>
              <dd className="font-mono tabular-nums text-[#CBD5E1]">
                {data.observed.gapDaysFirstToLast}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
            {t('requirement', {
              minTx: data.rules.minTransactions,
              minDays: data.rules.minTemporalSpreadDays,
            })}
          </p>
        </div>
      )}

      {!error && !loading && data?.status === 'ready' && <ReadyPanel data={data} />}
    </section>
  );
}

function ReadyPanel({ data }: { data: Extract<CashflowLiquidityOutput, { status: 'ready' }> }) {
  const locale = useLocale();
  const t = useTranslations('finanzas.liquidity');
  const warn = data.negativeProjectedNetFlow || data.projectedEndBalanceBelowZero;
  const positive = !data.negativeProjectedNetFlow && !data.projectedEndBalanceBelowZero;

  const toneBorder = warn
    ? 'border-amber-500/40 bg-amber-950/25'
    : positive
      ? 'border-emerald-500/30 bg-emerald-950/20'
      : 'border-[#334155] bg-[#111827]/60';

  const headlineClass = warn
    ? 'text-amber-200'
    : positive
      ? 'text-emerald-200'
      : 'text-[#94A3B8]';

  return (
    <div className="mt-4 space-y-4">
      <div className={`rounded-lg border px-4 py-3 ${toneBorder}`}>
        <p className={`text-sm font-medium leading-relaxed ${headlineClass}`}>
          {warn ? t('warnHeadline') : t('okHeadline')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t('metricNet30')}
          value={formatMoneyAmount(data.projectedNetCashflow30d, data.currency, locale)}
          sub={
            data.negativeProjectedNetFlow ? (
              <span className="text-amber-400/90">{t('subNetNegative')}</span>
            ) : (
              <span className="text-emerald-400/90">{t('subNetOk')}</span>
            )
          }
        />
        <MetricCard
          label={t('metricEndBalance')}
          value={formatMoneyAmount(data.projectedEndBalance, data.currency, locale)}
          sub={
            data.projectedEndBalanceBelowZero ? (
              <span className="text-red-300/90">{t('subBalanceNegative')}</span>
            ) : (
              <span className="text-[#94A3B8]">{t('subBalanceOk')}</span>
            )
          }
        />
        <MetricCard
          label={t('metricMeanDaily')}
          value={formatMoneyAmount(data.meanDailyNet, data.currency, locale)}
          sub={
            <span className="text-[#64748B]">
              {t('windowLine', {
                obsDays: data.observationWindowDays,
                horizon: data.horizonDays,
              })}
            </span>
          }
        />
      </div>

      <p className="text-xs leading-relaxed text-[#64748B]">{t('disclaimer')}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#1E293B] bg-[#111827]/50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#F9FAFB]">{value}</p>
      <div className="mt-1 text-xs">{sub}</div>
    </div>
  );
}
