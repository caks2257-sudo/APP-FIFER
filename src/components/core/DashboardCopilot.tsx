'use client';

import { usePathname } from 'next/navigation';

import MinimalistContextChat from '@/components/core/MinimalistContextChat';

/**
 * Copiloto global del dashboard: contexto «Orquestador» en la ruta AODS para §27 + ideación unificada.
 */
export default function DashboardCopilot() {
  const pathname = usePathname();
  const appContext = pathname?.includes('/ia-orchestrator') ? 'Orquestador' : 'Dashboard Principal';

  return <MinimalistContextChat appContext={appContext} />;
}
