import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string;
  trend: {
    value: string;
    direction: 'up' | 'down';
    detail: string;
  };
  isRefining?: boolean;
};

export default function StatCard({ title, value, trend, isRefining = false }: StatCardProps) {
  const isPositive = trend.direction === 'up';
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className={`rounded-xl border border-white/5 bg-[#1E293B] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
        isRefining ? 'animate-pulse ring-1 ring-[#EAB308]/20' : ''
      }`}
    >
      <p className="font-title text-sm text-[#CBD5E1]">{title}</p>
      <p className="mt-3 font-data text-3xl font-semibold tracking-tight text-[#F9FAFB]">{value}</p>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-data font-medium ${
            isPositive ? 'bg-[#EAB308]/15 text-[#EAB308]' : 'bg-[#334155] text-[#CBD5E1]'
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {trend.value}
        </span>
        <span className="font-data text-[#94A3B8]">{trend.detail}</span>
      </div>
    </article>
  );
}
