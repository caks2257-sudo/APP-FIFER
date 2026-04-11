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
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </DashboardLayout>
  );
}
