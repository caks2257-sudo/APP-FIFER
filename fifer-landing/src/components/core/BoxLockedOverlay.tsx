import React from "react";
import { Lock, Key } from "lucide-react";

interface BoxLockedOverlayProps {
  moduleName?: string;
  reason?: string;
}

export function BoxLockedOverlay({
  moduleName = "Este módulo",
  reason = "API Key requerida o sin permisos.",
}: BoxLockedOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E]/90 p-6 text-center backdrop-blur-sm">
      <div className="mb-4 rounded-full border border-[#252525] bg-[#111] p-3">
        <Lock className="h-6 w-6 text-[#EAB308]" strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 font-['Inter',_sans-serif] text-lg font-semibold text-[#f4f4f5]">
        Acceso Restringido
      </h3>
      <p className="mb-6 max-w-[200px] text-sm text-[#9ca3af]">
        {moduleName} está bloqueado por el Gateway. {reason}
      </p>
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-[#EAB308]/30 bg-[#EAB308]/10 px-4 py-2 text-sm text-[#EAB308] transition-colors hover:bg-[#EAB308]/20"
      >
        <Key className="h-4 w-4" />
        <span>Vincular Llave</span>
      </button>
    </div>
  );
}
