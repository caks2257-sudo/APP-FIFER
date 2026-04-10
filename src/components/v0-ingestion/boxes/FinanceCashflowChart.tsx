import { Sparkles } from 'lucide-react';
import type { BoxProps } from '../registry';

export default function FinanceCashflowChart({ data, isRefining = false }: BoxProps) {
  const payload = data as {
    title: string;
    subtitle: string;
    series: Array<{ label: string; value: number }>;
  };
  const maxValue = Math.max(...payload.series.map((item) => item.value), 1);

  return (
    <article
      className={`rounded-xl border border-white/5 bg-[#1E293B] p-6 ${
        isRefining ? 'animate-pulse ring-1 ring-[#059669]/40' : ''
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-title text-base text-[#F9FAFB]">{payload.title}</h3>
          <p className="font-data text-xs text-[#94A3B8]">{payload.subtitle}</p>
        </div>
        {isRefining && <Sparkles className="h-4 w-4 text-[#059669]" />}
      </div>

      <div className="flex h-56 items-end gap-3 rounded-xl bg-[#0A0F1E]/70 p-4">
        {payload.series.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-md bg-gradient-to-t from-[#059669] to-[#34D399]"
              style={{ height: `${(point.value / maxValue) * 100}%` }}
            />
            <span className="font-data text-xs text-[#9CA3AF]">{point.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
