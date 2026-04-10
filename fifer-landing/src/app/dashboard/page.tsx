import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatsBox from '@/components/dashboard/boxes/StatsBox';
import ChartBox from '@/components/dashboard/boxes/ChartBox';
import ActivityBox from '@/components/dashboard/boxes/ActivityBox';
import GhostBox from '@/components/dashboard/boxes/GhostBox';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F9FAFB] mb-1">Dashboard</h1>
        <p className="text-sm text-[#6B7280]">
          Gestión integral de expedientes, trámites y permisos de construcción
        </p>
      </div>

      {/* 12-Column Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Row 1: Stats (4 cols) + Chart (8 cols) */}
        <StatsBox />
        <ChartBox />

        {/* Row 2: Ghost State (8 cols) + Activity List (4 cols) */}
        <GhostBox />
        <ActivityBox />
      </div>
    </DashboardLayout>
  );
}
