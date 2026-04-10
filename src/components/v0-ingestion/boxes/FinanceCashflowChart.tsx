import { Sparkles } from 'lucide-react';
import type { BoxProps } from '../registry';

type SeriesPoint = { label: string; value: number };

function normalizeSeries(raw: unknown): SeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (!item || typeof item !== 'object') {
      return { label: '', value: 0 };
    }
    const o = item as Record<string, unknown>;
    const v = o.value;
    const num = typeof v === 'number' ? v : Number(v);
    return {
      label: String(o.label ?? ''),
      value: Number.isFinite(num) ? num : 0,
    };
  });
}

export default function FinanceCashflowChart({ data, isRefining = false }: BoxProps) {
  const raw = data as Record<string, unknown> | null | undefined;
  const nested = raw?.payload as Record<string, unknown> | undefined;

  const title = String(nested?.title ?? raw?.title ?? 'Flujo de Caja Operativo');
  const subtitle = String(nested?.subtitle ?? raw?.subtitle ?? '');

  const seriesRaw = nested?.series ?? raw?.series;
  const safeSeries = normalizeSeries(seriesRaw);

  const maxValue =
    safeSeries.length > 0 ? Math.max(...safeSeries.map((i) => i.value), 1) : 100;

  const isEmpty = safeSeries.length === 0;

  return (
    <article
      className={`rounded-xl border border-white/5 bg-[#1E293B] p-6 ${
        isRefining ? 'animate-pulse ring-1 ring-[#059669]/40' : ''
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-title text-base text-[#F9FAFB]">{title}</h3>
          <p className="font-data text-xs text-[#94A3B8]">{subtitle}</p>
        </div>
        {isRefining && <Sparkles className="h-4 w-4 text-[#059669]" />}
      </div>

      {isEmpty ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#0A0F1E]/90 px-6 text-center">
          <p className="font-title text-sm text-[#F9FAFB]">Sin datos de flujo de caja</p>
          <p className="font-data max-w-sm text-xs text-[#94A3B8]">
            No hay serie temporal disponible. Cuando el motor entregue datos, el gráfico se mostrará aquí.
          </p>
        </div>
      ) : (
        <div className="flex h-56 items-end gap-3 rounded-xl bg-[#0A0F1E]/70 p-4">
          {safeSeries.map((point, index) => (
            <div
              key={point.label ? `${point.label}-${index}` : `cashflow-bar-${index}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div
                className="w-full rounded-md bg-gradient-to-t from-[#059669] to-[#34D399]"
                style={{
                  height: `${maxValue > 0 ? (point.value / maxValue) * 100 : 0}%`,
                }}
              />
              <span className="font-data text-xs text-[#9CA3AF]">{point.label}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}