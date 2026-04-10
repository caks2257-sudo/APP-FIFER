"use client";

import { Zap } from "lucide-react";

/**
 * Upsell Motor Pro (Etapa 2) — estado de negocio válido, no error.
 * Glassmorphism sobre Deep Navy; CTA demo vía `onUnlock` (p. ej. `setIsPremium`).
 */
export function JITUpsellBanner({
  boxId,
  onUnlock,
  className = "",
}: {
  boxId: string;
  onUnlock?: () => void;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label="Motor Pro disponible"
      data-fifer-jit-upsell="pro-motor"
      data-box-id={boxId}
      className={`mb-3 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md backdrop-saturate-150 ${className}`}
    >
      <div className="flex flex-wrap items-start gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#EAB308]/25 bg-[#EAB308]/10 text-[#EAB308]"
          aria-hidden
        >
          <Zap className="h-4 w-4" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-tight text-zinc-100">Motor Pro · calidad de estudio</p>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
            Esta acción puede ejecutarse con el motor de pago (Etapa 2). Desbloquea razonamiento profundo y salidas
            listas para producción.
          </p>
        </div>
        <button
          type="button"
          onClick={onUnlock}
          className="shrink-0 rounded-lg border border-[#EAB308]/40 bg-[#EAB308]/12 px-3 py-1.5 text-[11px] font-semibold text-[#FEF9C3] transition hover:bg-[#EAB308]/20"
        >
          Desbloquear
        </button>
      </div>
    </div>
  );
}
