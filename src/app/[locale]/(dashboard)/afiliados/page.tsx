'use client';

import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';
import { useUserDnaStore } from '@/store/useUserDnaStore';

export default function AfiliadosPage() {
  const profile = useUserDnaStore((s) => s.coreProfile);
  if (profile.role !== 'admin') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-[#0A0F1E]/90 p-6 text-center text-sm text-red-200">
        Acceso Denegado
      </div>
    );
  }

  return (
    <BoxErrorBoundary>
      {/* Const. v6.0 — inmunidad: el circuito registra fallos con boxCircuitBreaker.recordFailure (p. ej. useBoxData / shells de box). */}
      {/* Ancho y centrado: heredado de src/app/(dashboard)/layout.tsx (max-w-7xl mx-auto). */}
      <BaseBoxTemplate config={{ title: "Afiliados" }} />
      <SmartInsightWidget
        moduleId="afiliados"
        boxId="afiliados-page"
        contextData={{}}
        systemInstruction={"Genera insights de valor operativo para el módulo «Afiliados» (id: afiliados). Prioriza riesgos, oportunidades y próximos pasos concretos alineados con FIFER v6.0."}
      />
    </BoxErrorBoundary>
  );
}
