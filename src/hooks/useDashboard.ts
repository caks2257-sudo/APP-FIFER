import { useEffect, useMemo, useState } from 'react';
import { toFiferBoxData, type RawDashboardPayload } from '@/utils/adapters/dashboardAdapter';
import type { FiferDashboardState } from '@/utils/adapters/dashboardAdapter';
import { DASHBOARD_REFERENCE_WIDGETS } from '@/config/dashboardReferenceWidgets';
import { useLayoutStore } from '@/store/useLayoutStore';

const baseWidgets = DASHBOARD_REFERENCE_WIDGETS;

const emptyState: FiferDashboardState = {
  data: {
    biomeColors: {
      finance: '#10B981',
      content: '#3B82F6',
    },
    widgetBiomes: {},
  },
  config: { widgets: baseWidgets },
  isRefining: false,
};

export function useDashboard() {
  const lockedByBoxId = useLayoutStore((state) => state.lockedByBoxId);
  const heroByBoxId = useLayoutStore((state) => state.heroByBoxId);
  const isRefineAllActive = useLayoutStore((state) => state.isRefineAllActive);

  const [dashboardState, setDashboardState] = useState<FiferDashboardState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/dashboard', { method: 'GET' });
        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorPayload?.error ?? `Dashboard API failed (${response.status})`);
        }
        const rawPayload = (await response.json()) as RawDashboardPayload;
        if (!isMounted) return;
        setDashboardState(toFiferBoxData(rawPayload));
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error('Dashboard fetch failed'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo(() => {
    const widgetsWithTransportState = dashboardState.config.widgets.map((widget) => ({
      ...widget,
      colSpan:
        widget.boxId === 'content-ingestion-form' && heroByBoxId['content-ingestion-form']
          ? 12
          : widget.colSpan,
      state: {
        ...widget.state,
        isLoading,
        hasError: Boolean(error),
        isLocked: lockedByBoxId[widget.boxId] ?? widget.state?.isLocked ?? false,
      },
    }));

    return {
      data: dashboardState.data,
      config: { widgets: widgetsWithTransportState },
      isRefining: dashboardState.isRefining || isRefineAllActive,
      isLoading,
      error,
    };
  }, [dashboardState, isLoading, error, lockedByBoxId, heroByBoxId, isRefineAllActive]);
}
