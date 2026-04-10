import type { FiferBoxId, UserBoxLayoutEntry } from "@/types/fifer-box";

export const HERO_COL_SPAN = 12;
export const HERO_ROW_SPAN = 2;

/** Recalcula x/y y spans efectivos para las cajas de un slot (orden = `ids`). */
export function flowPositionsForSlot(
  ids: FiferBoxId[],
  layout: Record<FiferBoxId, UserBoxLayoutEntry>,
  slotName: string
): Record<FiferBoxId, UserBoxLayoutEntry> {
  const next = { ...layout };
  let row = 0;
  for (const id of ids) {
    const e = layout[id];
    if (!e || e.slotName !== slotName) continue;
    const w = e.isExpanded ? HERO_COL_SPAN : Math.min(12, e.baseColSpan);
    const h = e.isExpanded ? HERO_ROW_SPAN : Math.min(6, e.baseRowSpan);
    next[id] = {
      ...e,
      x: 0,
      y: row,
      colSpan: w,
      rowSpan: h,
    };
    row += h;
  }
  return next;
}
