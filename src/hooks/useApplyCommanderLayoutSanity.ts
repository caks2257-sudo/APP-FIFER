'use client';

import { useEffect, useRef } from 'react';
import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import { useLayoutStore } from '@/store/useLayoutStore';
import { applyLayoutSanityForCommander } from '@/utils/layout/commanderLayoutSanity';

/**
 * En la ruta del dashboard, aplica `applyLayoutSanityForCommander` y sincroniza `slotOrder` si hay reparaciones.
 */
export function useApplyCommanderLayoutSanity(widgets: DashboardWidget[]) {
  const slotOrder = useLayoutStore((s) => s.slotOrder);
  const setSlotOrder = useLayoutStore((s) => s.setSlotOrder);
  const prevRepairSig = useRef<string>('');

  useEffect(() => {
    const { slotOrder: nextOrder, report } = applyLayoutSanityForCommander({
      widgets,
      slotOrder,
    });

    const repairSig = report.repairedSlots.slice().sort().join('|');
    if (repairSig && repairSig !== prevRepairSig.current) {
      prevRepairSig.current = repairSig;
      if (process.env.NODE_ENV === 'development') {
        console.info('[CommanderLayoutSanity]', report);
      }
    }

    if (nextOrder.join('|') !== slotOrder.join('|')) {
      setSlotOrder(nextOrder);
    }
  }, [widgets, slotOrder, setSlotOrder]);
}
