'use client';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';
import Link from 'next/link';

const domSpokes = [
  { href: '/dom/recepcion', label: 'Recepción Municipal', description: 'Flujo de recepción municipal.' },
  { href: '/dom/permisos', label: 'Permisos de Edificación', description: 'Permisos y revisión documental.' },
  { href: '/dom/regularizaciones', label: 'Regularizaciones', description: 'Regularización de obras y normativa.' },
  { href: '/dom/normativa', label: 'Normativa OGUC/LGUC', description: 'Consulta y análisis normativo.' },
];

export default function DomHubPage() {
  return (
    <BoxErrorBoundary>
      <div className="flex w-full flex-col gap-8 pb-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">
            Hub DOM - Panel de Arquitecto
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Punto de entrada al trámite DOM: elija un módulo (Spoke) o use el insight para orientación.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {domSpokes.map((spoke) => (
            <Link
              key={spoke.href}
              href={spoke.href}
              className="block rounded-xl border border-[#1E293B] bg-[#111827]/40 p-5 transition hover:border-[#EAB308]/40 hover:bg-[#111827]/80"
            >
              <h2 className="text-base font-semibold text-[#F9FAFB]">{spoke.label}</h2>
              <p className="mt-2 text-sm text-[#94A3B8]">{spoke.description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-[#EAB308]">Abrir →</span>
            </Link>
          ))}
        </section>

        <section className="border-t border-[#1E293B] pt-8">
          <SmartInsightWidget
            moduleId="dom"
            boxId="dom-hub"
            contextData={{}}
            systemInstruction={
              'Genera orientación para el Hub DOM (trámites municipales). Prioriza el siguiente paso según el tipo de trámite.'
            }
          />
        </section>
      </div>
    </BoxErrorBoundary>
  );
}
