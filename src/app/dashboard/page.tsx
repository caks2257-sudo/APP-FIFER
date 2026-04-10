'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDashboard } from '@/hooks/useDashboard';

export default function DashboardPage() {
  const { data, config, isRefining, isLoading, error } = useDashboard();

  return (
    <DashboardLayout
      data={data}
      config={config}
      isRefining={isRefining}
      isLoading={isLoading}
      hasError={Boolean(error)}
    />
  );
}
