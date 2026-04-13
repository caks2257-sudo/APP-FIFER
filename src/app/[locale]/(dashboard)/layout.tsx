import DashboardCopilot from '@/components/core/DashboardCopilot';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

/**
 * Route group `(dashboard)`: shell nativo (Sidebar, Topbar, auth) para todas las apps bajo esta rama.
 */
export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8">
        <DashboardCopilot />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </DashboardLayout>
  );
}
