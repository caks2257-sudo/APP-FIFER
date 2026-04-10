import { BadgeDollarSign } from 'lucide-react';
import type { BoxProps } from '../registry';

export default function AffiliateHeroSummary({ data }: BoxProps) {
  const payload = data as {
    title: string;
    value: string;
    caption: string;
  };

  return (
    <article className="rounded-xl border border-white/5 bg-[#1E293B] p-6">
      <div className="mb-4 flex items-center gap-2">
        <BadgeDollarSign className="h-4 w-4 text-[#EAB308]" />
        <h3 className="font-title text-base text-[#F9FAFB]">{payload.title}</h3>
      </div>
      <p className="font-data text-3xl font-semibold text-[#EAB308]">{payload.value}</p>
      <p className="mt-2 font-data text-xs text-[#94A3B8]">{payload.caption}</p>
    </article>
  );
}
