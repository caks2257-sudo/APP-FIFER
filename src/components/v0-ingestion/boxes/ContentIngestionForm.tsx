import { Sparkles, Upload } from 'lucide-react';
import type { BoxProps } from '../registry';

export default function ContentIngestionForm({ data, isRefining = false }: BoxProps) {
  const payload = data as {
    title: string;
    description: string;
    sourceLabel: string;
    placeholder: string;
  };

  return (
    <article
      className={`rounded-xl border border-white/5 bg-[#1E293B] p-6 ${
        isRefining ? 'animate-pulse ring-1 ring-[#1E3A5F]/60' : ''
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-title text-base text-[#F9FAFB]">{payload.title}</h3>
          <p className="font-data text-xs text-[#94A3B8]">{payload.description}</p>
        </div>
        {isRefining ? <Sparkles className="h-4 w-4 text-[#1E3A5F]" /> : <Upload className="h-4 w-4 text-[#1E3A5F]" />}
      </div>

      <div className="space-y-3">
        <label className="block font-data text-xs text-[#9CA3AF]">{payload.sourceLabel}</label>
        <input
          readOnly
          value={payload.placeholder}
          className="w-full rounded-xl border border-white/5 bg-[#0A0F1E] px-3 py-2 font-data text-sm text-[#E2E8F0] outline-none"
        />
        <button
          type="button"
          className="w-full rounded-xl bg-[#1E3A5F] px-4 py-2 font-data text-sm text-[#DBEAFE]"
        >
          Iniciar Ingesta
        </button>
      </div>
    </article>
  );
}
