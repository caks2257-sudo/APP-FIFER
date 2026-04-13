import { useEffect, useMemo, useState } from 'react';
import { DASHBOARD_REFERENCE_WIDGETS } from '@/config/dashboardReferenceWidgets';
import { useLayoutStore } from '@/store/useLayoutStore';
import { dashboardLayoutPersistedSchema } from '@/types/dashboard-layout-persisted';
import { toFiferBoxData, type RawDashboardPayload } from '@/utils/adapters/dashboardAdapter';
import type { FiferDashboardState } from '@/utils/adapters/dashboardAdapter';

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
  const liquidAddonWidgets = useLayoutStore((state) => state.liquidAddonWidgets);

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
        const rawPayload = (await response.json()) as RawDashboardPayload & {
          dashboardLayout?: unknown;
        };
        if (!isMounted) return;

        const { dashboardLayout, ...rest } = rawPayload;
        const merged = toFiferBoxData(rest as RawDashboardPayload);
        const apiIds = merged.config.widgets.map((w) => w.id);

        if (dashboardLayout !== undefined && dashboardLayout !== null) {
          const parsedLayout = dashboardLayoutPersistedSchema.safeParse(dashboardLayout);
          if (parsedLayout.success) {
            useLayoutStore.getState().hydrateDashboardLayoutFromServer(parsedLayout.data, apiIds);
          } else {
            useLayoutStore.getState().markLayoutHydrated();
          }
        } else {
          useLayoutStore.getState().markLayoutHydrated();
        }

        setDashboardState(merged);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error('Dashboard fetch failed'));
        useLayoutStore.getState().markLayoutHydrated();
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
    const base = dashboardState.config.widgets;
    const liquid = liquidAddonWidgets.filter((w) => !base.some((b) => b.id === w.id));
    const merged = [...base, ...liquid];

    const widgetsWithTransportState = merged.map((widget) => ({
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
  }, [
    dashboardState,
    isLoading,
    error,
    lockedByBoxId,
    heroByBoxId,
    isRefineAllActive,
    liquidAddonWidgets,
  ]);
}
