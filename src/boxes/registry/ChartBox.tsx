'use client';

import SmartBox from '@/components/dashboard/SmartBox';
import { HiOutlineChartBar, HiOutlineCalendar } from 'react-icons/hi';

export type ChartBarPoint = {
  month: string;
  permisos: number;
  tramites: number;
};

type Props = {
  /** Serie inyectada por el padre / API — sin datos demo en el componente. */
  series: ChartBarPoint[];
  title?: string;
};

export default function ChartBox({
  series,
  title = 'Evolución de Permisos y Trámites',
}: Props) {
  if (series.length === 0) {
    return (
      <SmartBox
        title={title}
        icon={<HiOutlineChartBar className="h-4 w-4" />}
        className="col-span-12 lg:col-span-8"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-[#1F2937] px-2.5 py-1.5 text-xs text-[#9CA3AF] transition-all hover:bg-[#374151]"
          >
            <HiOutlineCalendar className="h-3.5 w-3.5" />
            <span>Sin rango</span>
          </button>
        }
      >
        <p className="text-sm text-[#94A3B8]">
          No hay serie temporal. Inyecte <code className="font-mono text-[#EAB308]">series</code> desde el padre
          (data-driven).
        </p>
      </SmartBox>
    );
  }

  const maxValue = Math.max(...series.flatMap((d) => [d.permisos, d.tramites]));

  return (
    <SmartBox
      title={title}
      icon={<HiOutlineChartBar className="h-4 w-4" />}
      className="col-span-12 lg:col-span-8"
      actions={
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-[#1F2937] px-2.5 py-1.5 text-xs text-[#9CA3AF] transition-all hover:bg-[#374151]"
        >
          <HiOutlineCalendar className="h-3.5 w-3.5" />
          <span>Últimos {series.length} puntos</span>
        </button>
      }
    >
      <div className="mb-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#EAB308]" />
          <span className="text-xs text-[#9CA3AF]">Permisos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#3B82F6]" />
          <span className="text-xs text-[#9CA3AF]">Trámites</span>
        </div>
      </div>

      <div className="relative h-48">
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between pr-2 text-xs text-[#6B7280]">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.66)}</span>
          <span>{Math.round(maxValue * 0.33)}</span>
          <span>0</span>
        </div>

        <div className="ml-8 flex h-full items-end gap-4">
          {series.map((row) => (
            <div key={row.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end gap-1">
                <div
                  className="flex-1 rounded-t-lg bg-gradient-to-t from-[#EAB308]/80 to-[#EAB308]/40 transition-all hover:from-[#EAB308] hover:to-[#EAB308]/60"
                  style={{ height: `${(row.permisos / maxValue) * 100}%` }}
                />
                <div
                  className="flex-1 rounded-t-lg bg-gradient-to-t from-[#3B82F6]/80 to-[#3B82F6]/40 transition-all hover:from-[#3B82F6] hover:to-[#3B82F6]/60"
                  style={{ height: `${(row.tramites / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#6B7280]">{row.month}</span>
            </div>
          ))}
        </div>
      </div>
    </SmartBox>
  );
}
