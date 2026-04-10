'use client';

import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================
// BDUI Contract Interface
// ============================================
interface CommissionBreakdown {
  label: string;
  amount: number;
  status: 'paid' | 'pending' | 'processing';
}

interface AffiliateHeroData {
  affiliateName?: string;
  affiliateLevel?: string;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  commissionChange: number;
  nextPayoutDate?: string;
  breakdown?: CommissionBreakdown[];
}

interface AffiliateHeroConfig {
  showBreakdown?: boolean;
  showNextPayout?: boolean;
  accentStyle?: 'solid' | 'gradient';
}

interface AffiliateHeroSummaryProps {
  data: AffiliateHeroData | null;
  config?: AffiliateHeroConfig;
  isRefining?: boolean;
  isLocked?: boolean;
}

// ============================================
// Mock Data for Preview
// ============================================
const mockData: AffiliateHeroData = {
  affiliateName: 'Gonzalo Fernandez',
  affiliateLevel: 'Partner Gold',
  totalCommissions: 8450000,
  pendingCommissions: 1250000,
  paidCommissions: 7200000,
  commissionChange: 18.5,
  nextPayoutDate: '15 de Abril, 2024',
  breakdown: [
    { label: 'Proyecto Aurora', amount: 450000, status: 'paid' },
    { label: 'Edificio Central', amount: 380000, status: 'processing' },
    { label: 'Torre Pacifica', amount: 520000, status: 'pending' },
  ],
};

const defaultConfig: AffiliateHeroConfig = {
  showBreakdown: true,
  showNextPayout: true,
  accentStyle: 'gradient',
};

// ============================================
// Component
// ============================================
export default function AffiliateHeroSummary({
  data,
  config,
  isRefining = false,
  isLocked = false,
}: AffiliateHeroSummaryProps) {
  const displayData = data ?? mockData;
  const displayConfig = { ...defaultConfig, ...config };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statusStyles = {
    paid: {
      bg: 'bg-[#059669]/10',
      text: 'text-[#059669]',
      label: 'Pagado',
    },
    pending: {
      bg: 'bg-[#EAB308]/10',
      text: 'text-[#EAB308]',
      label: 'Pendiente',
    },
    processing: {
      bg: 'bg-[#3B82F6]/10',
      text: 'text-[#3B82F6]',
      label: 'En Proceso',
    },
  };

  return (
    <div
      className={clsx(
        'relative bg-[#111827] border rounded-xl overflow-hidden transition-all duration-300',
        isRefining
          ? 'border-[#EAB308] shadow-[0_0_30px_rgba(234,179,8,0.15)]'
          : 'border-[#1F2937]',
        isLocked && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Hero Header with Gradient Accent */}
      <div
        className={clsx(
          'relative px-6 pt-6 pb-8',
          displayConfig.accentStyle === 'gradient'
            ? 'bg-gradient-to-br from-[#EAB308]/10 via-[#111827] to-[#111827]'
            : ''
        )}
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#EAB308]/5 rounded-full blur-3xl" />
        <div className="absolute top-8 right-8 w-16 h-16 bg-[#EAB308]/10 rounded-full blur-2xl" />

        {/* Affiliate Badge */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EAB308] to-[#CA8A04] flex items-center justify-center shadow-lg shadow-[#EAB308]/20">
              <Wallet className="w-6 h-6 text-[#0A0F1E]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F9FAFB]">
                {displayData.affiliateName}
              </h3>
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-[#EAB308] fill-[#EAB308]" />
                <span className="text-xs text-[#EAB308] font-medium">
                  {displayData.affiliateLevel}
                </span>
              </div>
            </div>
          </div>

          {isRefining && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EAB308]/20 rounded-lg animate-pulse">
              <Zap className="w-3.5 h-3.5 text-[#EAB308]" />
              <span className="text-xs text-[#EAB308] font-medium">
                Actualizando
              </span>
            </div>
          )}
        </div>

        {/* Main Commission Display */}
        <div className="relative">
          <p className="text-xs text-[#9CA3AF] mb-1">Comisiones Totales</p>
          <div className="flex items-end gap-4">
            <p className="text-4xl font-bold text-[#F9FAFB] tracking-tight">
              {formatCurrency(displayData.totalCommissions)}
            </p>
            <div
              className={clsx(
                'flex items-center gap-1 pb-2',
                displayData.commissionChange >= 0
                  ? 'text-[#059669]'
                  : 'text-[#EF4444]'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">
                +{displayData.commissionChange}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative mt-6 grid grid-cols-2 gap-4">
          <div className="px-4 py-3 bg-[#0A0F1E]/60 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span className="text-xs text-[#6B7280]">Pagadas</span>
            </div>
            <p className="text-lg font-semibold text-[#F9FAFB]">
              {formatCurrency(displayData.paidCommissions)}
            </p>
          </div>
          <div className="px-4 py-3 bg-[#0A0F1E]/60 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-[#EAB308]" />
              <span className="text-xs text-[#6B7280]">Pendientes</span>
            </div>
            <p className="text-lg font-semibold text-[#F9FAFB]">
              {formatCurrency(displayData.pendingCommissions)}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Section */}
      {displayConfig.showBreakdown && displayData.breakdown && (
        <div className="px-6 py-4 border-t border-[#1F2937]">
          <p className="text-xs font-medium text-[#9CA3AF] mb-3">
            Ultimas Comisiones
          </p>
          <div className="space-y-2">
            {displayData.breakdown.map((item, index) => {
              const style = statusStyles[item.status];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#0A0F1E] rounded-xl hover:bg-[#0A0F1E]/80 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        style.bg
                      )}
                    >
                      <Wallet className={clsx('w-4 h-4', style.text)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F9FAFB]">
                        {item.label}
                      </p>
                      <p className={clsx('text-xs', style.text)}>{style.label}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#F9FAFB]">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Payout CTA */}
      {displayConfig.showNextPayout && displayData.nextPayoutDate && (
        <div className="px-6 py-4 bg-gradient-to-r from-[#EAB308]/10 to-transparent border-t border-[#1F2937]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6B7280]">Proximo Pago</p>
              <p className="text-sm font-semibold text-[#EAB308]">
                {displayData.nextPayoutDate}
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-[#EAB308] hover:bg-[#CA8A04] text-[#0A0F1E] text-xs font-semibold rounded-xl transition-all"
            >
              Ver Detalles
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
