type ChartBoxProps = {
  title: string;
  subtitle: string;
  series: Array<{ label: string; value: number }>;
  isRefining?: boolean;
};

export default function ChartBox({ title, subtitle, series, isRefining = false }: ChartBoxProps) {
  const maxValue = Math.max(...series.map((item) => item.value), 1);

  return (
    <article
      className={`rounded-xl border border-white/5 bg-[#1E293B] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
        isRefining ? 'animate-pulse ring-1 ring-[#EAB308]/20' : ''
      }`}
    >
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-title text-base font-semibold text-[#F9FAFB]">{title}</h2>
          <p className="mt-1 font-data text-sm text-[#94A3B8]">{subtitle}</p>
        </div>
        <span className="rounded-md bg-[#EAB308]/10 px-2 py-1 font-data text-xs text-[#EAB308]">
          Analitica
        </span>
      </div>

      <div className="flex h-64 items-end gap-3 rounded-lg bg-[#0A0F1E]/60 p-4">
        {series.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end">
              <div
                className="w-full rounded-md bg-gradient-to-t from-[#EAB308]/80 to-[#EAB308]/35"
                style={{ height: `${(point.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="font-data text-xs text-[#94A3B8]">{point.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
