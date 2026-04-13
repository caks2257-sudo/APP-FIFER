'use client';

import { useEffect, useRef } from 'react';

import { useLayoutStore } from '@/store/useLayoutStore';
import {
  buildDashboardLayoutPayload,
  serializeDashboardLayoutPayload,
} from '@/utils/dashboard-layout-serialize';

/**
 * Debounce 2s sobre layout (spans, orden, líquidos) y PATCH a Prisma.
 * El layout local prevalece si el servidor falla; se reintenta en el siguiente cambio.
 */
export default function DashboardLayoutSync() {
  const layoutHydrated = useLayoutStore((s) => s.layoutHydratedFromServer);
  const setLayoutSyncStatus = useLayoutStore((s) => s.setLayoutSyncStatus);
  const slotOrder = useLayoutStore((s) => s.slotOrder);
  const gridSpanByWidgetId = useLayoutStore((s) => s.gridSpanByWidgetId);
  const liquidAddonWidgets = useLayoutStore((s) => s.liquidAddonWidgets);
  const lastSentRef = useRef<string>('');

  /** Tras hidratar desde el servidor, alinea el último snapshot guardado para no PATCH redundante. */
  useEffect(() => {
    if (!layoutHydrated) return;
    const snap = buildDashboardLayoutPayload({
      slotOrder: useLayoutStore.getState().slotOrder,
      gridSpanByWidgetId: useLayoutStore.getState().gridSpanByWidgetId,
      liquidAddonWidgets: useLayoutStore.getState().liquidAddonWidgets,
    });
    lastSentRef.current = serializeDashboardLayoutPayload(snap);
  }, [layoutHydrated]);

  useEffect(() => {
    if (!layoutHydrated) return;

    const payload = buildDashboardLayoutPayload({
      slotOrder,
      gridSpanByWidgetId,
      liquidAddonWidgets,
    });
    const serialized = serializeDashboardLayoutPayload(payload);
    if (serialized === lastSentRef.current) return;

    const timer = window.setTimeout(async () => {
      const current = buildDashboardLayoutPayload({
        slotOrder: useLayoutStore.getState().slotOrder,
        gridSpanByWidgetId: useLayoutStore.getState().gridSpanByWidgetId,
        liquidAddonWidgets: useLayoutStore.getState().liquidAddonWidgets,
      });
      const ser = serializeDashboardLayoutPayload(current);
      if (ser === lastSentRef.current) return;

      setLayoutSyncStatus('syncing');
      try {
        const res = await fetch('/api/v1/dashboard/layout', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: ser,
        });
        if (!res.ok) throw new Error('layout patch failed');
        lastSentRef.current = ser;
        setLayoutSyncStatus('saved');
        window.setTimeout(() => setLayoutSyncStatus('idle'), 2800);
      } catch {
        setLayoutSyncStatus('error');
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [
    layoutHydrated,
    slotOrder,
    gridSpanByWidgetId,
    liquidAddonWidgets,
    setLayoutSyncStatus,
  ]);

  return null;
}
