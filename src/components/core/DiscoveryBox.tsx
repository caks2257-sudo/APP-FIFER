import type { ReactNode } from 'react';

export type DiscoveryReason = 'no-data' | 'error' | 'recovering' | 'circuit-open';

const copy: Record<
  DiscoveryReason,
  { title: string; body: string; borderClass: string; titleClass?: string }
> = {
  'no-data': {
    title: 'Sin datos de arrendamiento',
    body: 'Aún no hay contratos Chicureo sincronizados. Cuando el backend BDUI entregue el payload, la grilla se hidratará automáticamente.',
    borderClass: 'border-[#EAB308]/20',
  },
  error: {
    title: 'Módulo en pausa',
    body: 'Aislado el error para no romper el dashboard. Reintenta o revisa la fuente de datos.',
    borderClass: 'border-red-500/30',
  },
  recovering: {
    title: 'DiscoveryBox activo',
    body: 'Recuperando contexto del componente.',
    borderClass: 'border-dashed border-[#EAB308]/40',
  },
  'circuit-open': {
    title: 'Circuito abierto — protección activa',
    body: 'El dominio de contratos está aislado atómicamente: no se procesa el payload BDUI hasta el enfriamiento del circuito o sanación desde el System Health Monitor.',
    borderClass: 'border-[#ef4444]/45',
    titleClass: 'text-[#ef4444]',
  },
};

type DiscoveryBoxProps = {
  reason?: DiscoveryReason;
  className?: string;
  children?: ReactNode;
};

export default function DiscoveryBox({
  reason = 'recovering',
  className = '',
  children,
}: DiscoveryBoxProps) {
  const c = copy[reason];
  const titleCls = c.titleClass ?? 'text-[#F9FAFB]';
  return (
    <div
      className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-[0.75rem] border bg-[#1E293B] px-6 py-8 text-center ${c.borderClass} ${className}`.trim()}
    >
      <p className={`font-title text-sm font-semibold ${titleCls}`}>{c.title}</p>
      <p className="mt-2 max-w-md font-data text-sm text-[#94A3B8]">{c.body}</p>
      {children}
    </div>
  );
}
