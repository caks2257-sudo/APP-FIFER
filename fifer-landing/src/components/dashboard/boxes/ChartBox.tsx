'use client';

import SmartBox from '../SmartBox';
import { HiOutlineChartBar, HiOutlineCalendar } from 'react-icons/hi';

// Mock data for area chart visualization
const chartData = [
  { month: 'Ene', permisos: 12, tramites: 18 },
  { month: 'Feb', permisos: 15, tramites: 22 },
  { month: 'Mar', permisos: 8, tramites: 14 },
  { month: 'Abr', permisos: 22, tramites: 28 },
  { month: 'May', permisos: 18, tramites: 24 },
  { month: 'Jun', permisos: 25, tramites: 32 },
];

export default function ChartBox() {
  const maxValue = Math.max(...chartData.flatMap(d => [d.permisos, d.tramites]));
  
  return (
    <SmartBox 
      title="Evolución de Permisos y Trámites" 
      icon={<HiOutlineChartBar className="w-4 h-4" />}
      className="col-span-12 lg:col-span-8"
      actions={
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#9CA3AF] bg-[#1F2937] rounded-lg hover:bg-[#374151] transition-all">
          <HiOutlineCalendar className="w-3.5 h-3.5" />
          <span>Últimos 6 meses</span>
        </button>
      }
    >
      {/* Chart Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EAB308]" />
          <span className="text-xs text-[#9CA3AF]">Permisos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
          <span className="text-xs text-[#9CA3AF]">Trámites</span>
        </div>
      </div>

      {/* Simulated Area Chart */}
      <div className="relative h-48">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-[#6B7280] pr-2">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.66)}</span>
          <span>{Math.round(maxValue * 0.33)}</span>
          <span>0</span>
        </div>

        {/* Chart Area */}
        <div className="ml-8 h-full flex items-end gap-4">
          {chartData.map((data) => (
            <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
              {/* Bars */}
              <div className="w-full flex gap-1 items-end h-40">
                <div 
                  className="flex-1 bg-gradient-to-t from-[#EAB308]/80 to-[#EAB308]/40 rounded-t-lg transition-all hover:from-[#EAB308] hover:to-[#EAB308]/60"
                  style={{ height: `${(data.permisos / maxValue) * 100}%` }}
                />
                <div 
                  className="flex-1 bg-gradient-to-t from-[#3B82F6]/80 to-[#3B82F6]/40 rounded-t-lg transition-all hover:from-[#3B82F6] hover:to-[#3B82F6]/60"
                  style={{ height: `${(data.tramites / maxValue) * 100}%` }}
                />
              </div>
              {/* X-Axis Label */}
              <span className="text-xs text-[#6B7280]">{data.month}</span>
            </div>
          ))}
        </div>
      </div>
    </SmartBox>
  );
}
