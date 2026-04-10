'use client';

import { HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineChartPie } from 'react-icons/hi';
import SmartBox from '@/components/dashboard/SmartBox';

interface StatItem {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
}

const stats: StatItem[] = [
  { label: 'Trámites Activos', value: 24, change: 12, changeLabel: 'vs mes anterior' },
  { label: 'Expedientes', value: 156, change: -3, changeLabel: 'vs mes anterior' },
  { label: 'Permisos Aprobados', value: 18, change: 8, changeLabel: 'este mes' },
];

export default function StatsBox() {
  return (
    <SmartBox
      title="Resumen de Gestión"
      icon={<HiOutlineChartPie className="w-4 h-4" />}
      className="col-span-12 lg:col-span-4"
    >
      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between p-3 bg-[#0A0F1E] rounded-xl"
          >
            <div>
              <p className="text-xs text-[#6B7280] mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-[#F9FAFB]">{stat.value}</p>
            </div>
            <div className="text-right">
              <div
                className={`flex items-center gap-1 ${stat.change >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}
              >
                {stat.change >= 0 ? (
                  <HiOutlineTrendingUp className="w-4 h-4" />
                ) : (
                  <HiOutlineTrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {stat.change >= 0 ? '+' : ''}
                  {stat.change}%
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">{stat.changeLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </SmartBox>
  );
}
