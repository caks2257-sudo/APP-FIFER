'use client';

import { useState } from 'react';
import {
  FinanceCashflowChart,
  ContentIngestionForm,
  AffiliateHeroSummary,
} from '@/v0-ingestion/boxes';

export default function V0PreviewPage() {
  const [isRefining, setIsRefining] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0F1E] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#F9FAFB]">
            FIFER v0-ingestion Preview
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Componentes BDUI con contrato: data, config, isRefining, isLocked
          </p>

          {/* Toggle Refining */}
          <button
            type="button"
            onClick={() => setIsRefining(!isRefining)}
            className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isRefining
                ? 'bg-[#EAB308] text-[#0A0F1E]'
                : 'bg-[#1F2937] text-[#F9FAFB] hover:bg-[#374151]'
            }`}
          >
            {isRefining ? 'Desactivar Refining' : 'Activar isRefining'}
          </button>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Finance Cashflow Chart - Bioma Esmeralda */}
          <div className="col-span-12 xl:col-span-6">
            <FinanceCashflowChart
              data={null}
              config={{ showUfPending: true }}
              isRefining={isRefining}
              isLocked={false}
            />
          </div>

          {/* Affiliate Hero Summary - Bioma Electric Yellow */}
          <div className="col-span-12 xl:col-span-6">
            <AffiliateHeroSummary
              data={null}
              config={{ showBreakdown: true, showNextPayout: true }}
              isRefining={isRefining}
              isLocked={false}
            />
          </div>

          {/* Content Ingestion Form - Bioma Azul */}
          <div className="col-span-12 xl:col-span-8">
            <ContentIngestionForm
              data={null}
              config={{ layout: 'two-column', showFileUpload: true }}
              isRefining={isRefining}
              isLocked={false}
            />
          </div>

          {/* Locked State Demo */}
          <div className="col-span-12 xl:col-span-4">
            <div className="mb-3">
              <span className="text-xs text-[#6B7280]">Estado: isLocked = true</span>
            </div>
            <FinanceCashflowChart
              data={null}
              config={{ showUfPending: false, chartHeight: 140 }}
              isRefining={false}
              isLocked={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
