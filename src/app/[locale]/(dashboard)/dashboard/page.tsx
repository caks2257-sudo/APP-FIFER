'use client';

import PageOrchestrator from '@/components/core/PageOrchestrator';
import { useApplyCommanderLayoutSanity } from '@/hooks/useApplyCommanderLayoutSanity';
import { useDashboard } from '@/hooks/useDashboard';

export default function DashboardPage() {
  const { data, config, isRefining, isLoading, error } = useDashboard();
  void data;
  const resolvedConfig = config ?? { widgets: [] };

  useApplyCommanderLayoutSanity(config.widgets);

  return (
    <>
      {/* Const. v6.0 — inmunidad: el circuito registra fallos con boxCircuitBreaker.recordFailure (p. ej. useBoxData / shells de box). */}
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[#F9FAFB]">Dashboard</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">
          Vista analitica de expedientes, tramites y actividad operativa.
        </p>
      </header>

      <PageOrchestrator
        widgets={resolvedConfig.widgets}
        isRefining={isRefining}
        isLoading={isLoading}
        hasError={Boolean(error)}
      />
    </>
  );
}
