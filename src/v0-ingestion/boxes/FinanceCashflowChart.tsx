'use client';

import { TrendingUp, TrendingDown, Sparkles, DollarSign } from 'lucide-react';
import clsx from 'clsx';

// ============================================
// BDUI Contract Interface
// ============================================
interface CashflowDataPoint {
  period: string;
  inflow: number;
  outflow: number;
  balance: number;
}

interface FinanceCashflowData {
  title?: string;
  subtitle?: string;
  currency?: string;
  totalBalance: number;
  balanceChange: number;
  ufPending?: number;
  dataPoints: CashflowDataPoint[];
}

interface FinanceCashflowConfig {
  showUfPending?: boolean;
  chartHeight?: number;
  displayMode?: 'bar' | 'line';
}

interface FinanceCashflowChartProps {
  data: FinanceCashflowData | null;
  config?: FinanceCashflowConfig;
  isRefining?: boolean;
  isLocked?: boolean;
}

// ============================================
// Mock Data for Preview
// ============================================
const mockData: FinanceCashflowData = {
  title: 'Flujo de Caja',
  subtitle: 'Resumen Mensual',
  currency: 'CLP',
  totalBalance: 45680000,
  balanceChange: 12.4,
  ufPending: 245.8,
  dataPoints: [
    { period: 'Ene', inflow: 12500000, outflow: 8200000, balance: 4300000 },
    { period: 'Feb', inflow: 15800000, outflow: 9100000, balance: 6700000 },
    { period: 'Mar', inflow: 11200000, outflow: 10800000, balance: 400000 },
    { period: 'Abr', inflow: 18900000, outflow: 7600000, balance: 11300000 },
    { period: 'May', inflow: 14300000, outflow: 8900000, balance: 5400000 },
    { period: 'Jun', inflow: 22100000, outflow: 9500000, balance: 12600000 },
  ],
};

const defaultConfig: FinanceCashflowConfig = {
  showUfPending: true,
  chartHeight: 160,
  displayMode: 'bar',
};

// ============================================
// Component
// ============================================
export default function FinanceCashflowChart({
  data,
  config,
  isRefining = false,
  isLocked = false,
}: FinanceCashflowChartProps) {
  const displayData = data ?? mockData;
  const displayConfig = { ...defaultConfig, ...config };

  const maxValue = Math.max(
    ...displayData.dataPoints.flatMap((d) => [d.inflow, d.outflow])
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: displayData.currency || 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      className={clsx(
        'relative bg-[#111827] border rounded-xl overflow-hidden transition-all duration-300',
        isRefining
          ? 'border-[#059669] animate-pulse shadow-[0_0_20px_rgba(5,150,105,0.15)]'
          : 'border-[#1F2937]',
        isLocked && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Refining Indicator */}
      {isRefining && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-[#059669]/20 rounded-lg">
          <Sparkles className="w-3 h-3 text-[#059669] animate-spin" />
          <span className="text-xs text-[#059669] font-medium">Procesando</span>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#F9FAFB]">
              {displayData.title}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">{displayData.subtitle}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#059669]/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-[#059669]" />
          </div>
        </div>

        {/* Balance Summary */}
        <div className="mt-4 flex items-end gap-6">
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Balance Total</p>
            <p className="text-2xl font-bold text-[#F9FAFB]">
              {formatCurrency(displayData.totalBalance)}
            </p>
          </div>
          <div
            className={clsx(
              'flex items-center gap-1 pb-1',
              displayData.balanceChange >= 0 ? 'text-[#059669]' : 'text-[#EF4444]'
            )}
          >
            {displayData.balanceChange >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {displayData.balanceChange >= 0 ? '+' : ''}
              {displayData.balanceChange}%
            </span>
          </div>
        </div>

        {/* UF Pending Badge */}
        {displayConfig.showUfPending && displayData.ufPending && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#059669]/10 border border-[#059669]/20 rounded-lg">
            <span className="text-xs text-[#059669] font-medium">
              UF Pendientes:
            </span>
            <span className="text-sm text-[#F9FAFB] font-semibold">
              {displayData.ufPending.toLocaleString('es-CL')} UF
            </span>
          </div>
        )}
      </div>

      {/* Chart Legend */}
      <div className="px-5 pb-3 flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#059669]" />
          <span className="text-xs text-[#9CA3AF]">Ingresos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
          <span className="text-xs text-[#9CA3AF]">Egresos</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="px-5 pb-5">
        <div
          className="relative bg-[#0A0F1E] rounded-xl p-4"
          style={{ height: displayConfig.chartHeight }}
        >
          {/* Y-Axis Labels */}
          <div className="absolute left-4 top-4 bottom-8 flex flex-col justify-between text-[10px] text-[#6B7280]">
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency(maxValue / 2)}</span>
            <span>$0</span>
          </div>

          {/* Bars */}
          <div className="ml-16 h-full flex items-end gap-3 pb-6">
            {displayData.dataPoints.map((point) => (
              <div
                key={point.period}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full flex gap-1 items-end h-20">
                  {/* Inflow Bar */}
                  <div
                    className="flex-1 bg-gradient-to-t from-[#059669] to-[#059669]/60 rounded-t-md transition-all duration-300 hover:from-[#10B981] hover:to-[#059669]"
                    style={{ height: `${(point.inflow / maxValue) * 100}%` }}
                  />
                  {/* Outflow Bar */}
                  <div
                    className="flex-1 bg-gradient-to-t from-[#EF4444] to-[#EF4444]/60 rounded-t-md transition-all duration-300 hover:from-[#F87171] hover:to-[#EF4444]"
                    style={{ height: `${(point.outflow / maxValue) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#6B7280]">{point.period}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
