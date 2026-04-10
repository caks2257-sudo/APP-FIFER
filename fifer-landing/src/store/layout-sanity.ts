/**
 * Auto-sanación de layout (grid 12 cols): solapes y boxIds huérfanos respecto a `BOX_CATALOG`.
 * Invocado al hidratar metadata (`initFromMetadata`) y bajo demanda (`/limpiar-layout`).
 */
import { isBoxRegisteredInCatalog } from "@/registry/box-catalog";
import { HERO_COL_SPAN, HERO_ROW_SPAN, flowPositionsForSlot } from "@/store/layout-flow";
import type { SlotDictionary } from "@/types/architecture";
import type { FiferBoxId, IFiferBoxManifest, UserBoxLayoutEntry } from "@/types/fifer-box";
import { baseDimensionsFromManifest } from "@/types/fifer-box";

export interface RouteLayoutSliceInput {
  userLayout: Record<FiferBoxId, UserBoxLayoutEntry>;
  slotOrder: Record<string, FiferBoxId[]>;
}

function collectAllBoxIds(slots: SlotDictionary): Set<FiferBoxId> {
  const s = new Set<FiferBoxId>();
  for (const ids of Object.values(slots || {})) {
    (ids || []).forEach((id) => s.add(id));
  }
  return s;
}

function pruneUserLayout(
  userLayout: Record<FiferBoxId, UserBoxLayoutEntry>,
  validIds: Set<FiferBoxId>
): Record<FiferBoxId, UserBoxLayoutEntry> {
  const next: Record<FiferBoxId, UserBoxLayoutEntry> = {};
  validIds.forEach((id) => {
    if (userLayout[id]) next[id] = userLayout[id];
  });
  return next;
}

function buildDefaultBoxEntry(
  id: FiferBoxId,
  slotName: string,
  manifest: IFiferBoxManifest | undefined,
  indexInSlot: number
): UserBoxLayoutEntry {
  const { baseWidth, baseHeight } = baseDimensionsFromManifest(manifest);
  return {
    x: 0,
    y: indexInSlot,
    colSpan: baseWidth,
    rowSpan: baseHeight,
    isExpanded: false,
    baseColSpan: baseWidth,
    baseRowSpan: baseHeight,
    slotName,
    showAIFace: false,
  };
}

function entryGridRect(e: UserBoxLayoutEntry) {
  const w = e.isExpanded ? HERO_COL_SPAN : Math.min(12, e.colSpan);
  const h = e.isExpanded ? HERO_ROW_SPAN : Math.max(1, e.rowSpan);
  return {
    colStart: e.x + 1,
    colEnd: e.x + 1 + w,
    rowStart: e.y + 1,
    rowEnd: e.y + 1 + h,
  };
}

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return !(a1 <= b0 || b1 <= a0);
}

function boxesOverlap(a: UserBoxLayoutEntry, b: UserBoxLayoutEntry): boolean {
  const ga = entryGridRect(a);
  const gb = entryGridRect(b);
  return (
    intervalsOverlap(ga.colStart, ga.colEnd, gb.colStart, gb.colEnd) &&
    intervalsOverlap(ga.rowStart, ga.rowEnd, gb.rowStart, gb.rowEnd)
  );
}

function slotHasOverlap(
  userLayout: Record<FiferBoxId, UserBoxLayoutEntry>,
  slotName: string,
  order: FiferBoxId[]
): boolean {
  const rects: UserBoxLayoutEntry[] = [];
  for (const id of order) {
    const e = userLayout[id];
    if (!e || e.slotName !== slotName) continue;
    rects.push(e);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (boxesOverlap(rects[i]!, rects[j]!)) return true;
    }
  }
  return false;
}

function rebuildSlotFromManifest(
  userLayout: Record<FiferBoxId, UserBoxLayoutEntry>,
  slotName: string,
  metaIds: FiferBoxId[],
  manifests?: Partial<Record<string, IFiferBoxManifest>>
): { userLayout: Record<FiferBoxId, UserBoxLayoutEntry>; order: FiferBoxId[] } {
  const next = { ...userLayout };
  for (const id of metaIds) {
    delete next[id];
  }
  const built: Record<FiferBoxId, UserBoxLayoutEntry> = {};
  metaIds.forEach((id, idx) => {
    built[id] = buildDefaultBoxEntry(id, slotName, manifests?.[id], idx);
  });
  const flowed = flowPositionsForSlot(metaIds, built, slotName);
  return { userLayout: { ...next, ...flowed }, order: [...metaIds] };
}

/**
 * Repara slots con solape en grid o con algún `boxId` del manifiesto de ruta ausente en `BOX_CATALOG`.
 * No toca `isDemoMode` ni datos de negocio — solo `userLayout` / `slotOrder`.
 */
export function validateLayoutSanity(
  slice: RouteLayoutSliceInput,
  slots: SlotDictionary,
  manifests?: Partial<Record<string, IFiferBoxManifest>>
): RouteLayoutSliceInput & { repairedSlots: string[] } {
  const validIds = collectAllBoxIds(slots);
  let userLayout = pruneUserLayout({ ...slice.userLayout }, validIds);
  const slotOrder = { ...slice.slotOrder };
  const repairedSlots: string[] = [];

  for (const k of Object.keys(slotOrder)) {
    if (!(k in (slots || {}))) delete slotOrder[k];
  }

  for (const slotName of Object.keys(slots || {})) {
    const metaIds = (slots[slotName] || []) as FiferBoxId[];
    if (!metaIds.length) continue;

    const unknownCatalog = metaIds.some((id) => !isBoxRegisteredInCatalog(id));
    const order = (slotOrder[slotName] || metaIds).filter((id) => metaIds.includes(id));
    const normalizedOrder = [...order];
    for (const id of metaIds) {
      if (!normalizedOrder.includes(id)) normalizedOrder.push(id);
    }

    const overlap = slotHasOverlap(userLayout, slotName, normalizedOrder);

    if (unknownCatalog || overlap) {
      const r = rebuildSlotFromManifest(userLayout, slotName, metaIds, manifests);
      userLayout = r.userLayout;
      slotOrder[slotName] = r.order;
      repairedSlots.push(slotName);
    } else {
      slotOrder[slotName] = normalizedOrder;
    }
  }

  userLayout = pruneUserLayout(userLayout, validIds);

  return { userLayout, slotOrder, repairedSlots };
}
