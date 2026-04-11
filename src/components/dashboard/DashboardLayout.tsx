import ExpedienteHydrator from '@/components/perfil/ExpedienteHydrator';
import PageOrchestrator from '@/components/core/PageOrchestrator';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import type { DashboardWidget } from './mockDashboardConfig';

type DashboardLayoutData = Record<string, unknown>;

type DashboardLayoutConfig = {
  widgets: DashboardWidget[];
};

interface DashboardLayoutProps {
  data?: DashboardLayoutData;
  config?: DashboardLayoutConfig;
  isRefining?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  children?: React.ReactNode;
}

export default function DashboardLayout({
  data,
  config,
  isRefining = false,
  isLoading = false,
  hasError = false,
  children,
}: DashboardLayoutProps) {
  void data;
  const resolvedConfig = config ?? { widgets: [] };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-[#F9FAFB]">
      <ExpedienteHydrator />
      <Sidebar />
      <main className="ml-64 min-h-screen bg-[#0A0F1E]">
        <Topbar />
        <section className="px-8 pb-8 pt-28">
          {children != null ? (
            <div className="flex min-h-[calc(100dvh-7rem)] flex-col">{children}</div>
          ) : (
            <>
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
                hasError={hasError}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
