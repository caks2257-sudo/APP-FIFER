'use client';

import { usePathname } from 'next/navigation';

import MinimalistContextChat from '@/components/core/MinimalistContextChat';

/**
 * Copiloto global del dashboard: contexto «Orquestador» en la ruta AODS para §27 + ideación unificada.
 */
function resolveDashboardCopilotContext(pathname: string | null): string {
  if (!pathname) return 'Dashboard Principal';
  if (pathname.includes('/dashboard/mis-apps/ab-kupfer')) return 'ab-kupfer';
  if (pathname.includes('/ia-orchestrator')) return 'Orquestador';
  if (pathname.includes('/finanzas')) return 'finanzas';
  return 'Dashboard Principal';
}

export default function DashboardCopilot() {
  const pathname = usePathname();
  const appContext = resolveDashboardCopilotContext(pathname);

  return <MinimalistContextChat appContext={appContext} />;
}
