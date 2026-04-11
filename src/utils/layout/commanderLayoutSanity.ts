import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import { boxCatalog, type BoxId } from '@/registry/box-catalog';

export type CommanderLayoutSanityReport = {
  healthy: boolean;
  /** Acciones aplicadas: slots reordenados, huérfanos quitados, duplicados, clamp colSpan, etc. */
  repairedSlots: string[];
  orphanSlotIds: string[];
  duplicateWidgetIds: string[];
  unknownBoxIds: string[];
  /** Filas xl:12 simuladas donde la suma excedería 12 antes de salto de línea (informativo). */
  rowPackingNotes: string[];
  notes: string[];
};

function isRegisteredBoxId(id: string): id is BoxId {
  return Object.prototype.hasOwnProperty.call(boxCatalog, id);
}

function clampColSpan(w: DashboardWidget): { widget: DashboardWidget; repaired: boolean } {
  const span = Number(w.colSpan);
  if (!Number.isFinite(span) || span < 1) {
    return {
      widget: { ...w, colSpan: 4 } as DashboardWidget,
      repaired: true,
    };
  }
  if (span > 12) {
    return {
      widget: { ...w, colSpan: 12 } as DashboardWidget,
      repaired: true,
    };
  }
  const allowed = [4, 6, 8, 12] as const;
  const nearest = (allowed as readonly number[]).includes(span)
    ? (span as DashboardWidget['colSpan'])
    : (allowed.reduce((p, c) => (Math.abs(c - span) < Math.abs(p - span) ? c : p)) as DashboardWidget['colSpan']);
  if (nearest !== span) {
    return { widget: { ...w, colSpan: nearest } as DashboardWidget, repaired: true };
  }
  return { widget: w, repaired: false };
}

/**
 * Auditoría de sanidad del grid 12 columnas (Commander).
 * Normaliza `widgets` y `slotOrder` sin efectos secundarios en persistencia (eso lo hace el caller).
 */
export function applyLayoutSanityForCommander(input: {
  widgets: DashboardWidget[];
  slotOrder?: string[];
}): {
  report: CommanderLayoutSanityReport;
  widgets: DashboardWidget[];
  slotOrder: string[];
} {
  const repairedSlots: string[] = [];
  const notes: string[] = [];

  const idCount = new Map<string, number>();
  for (const w of input.widgets) {
    idCount.set(w.id, (idCount.get(w.id) ?? 0) + 1);
  }
  const duplicateWidgetIds = Array.from(idCount.entries())
    .filter(([, n]) => n > 1)
    .map(([id]) => id);

  const seenW = new Set<string>();
  const widgets: DashboardWidget[] = [];
  for (const w of input.widgets) {
    if (seenW.has(w.id)) {
      repairedSlots.push(`drop-duplicate-widget:${w.id}`);
      continue;
    }
    seenW.add(w.id);
    const { widget, repaired } = clampColSpan(w);
    if (repaired) repairedSlots.push(`colspan-normalize:${w.id}`);
    widgets.push(widget);
  }

  const unknownBoxIds = widgets.filter((w) => !isRegisteredBoxId(w.boxId)).map((w) => w.boxId);

  const widgetIds = widgets.map((w) => w.id);
  const widgetSet = new Set(widgetIds);
  const incoming = input.slotOrder ?? [];

  const orphanSlotIds = incoming.filter((id) => !widgetSet.has(id));
  for (const id of orphanSlotIds) {
    repairedSlots.push(`strip-orphan-slot:${id}`);
  }

  const nextOrder: string[] = [];
  const seenSlot = new Set<string>();
  for (const id of incoming) {
    if (!widgetSet.has(id)) continue;
    if (seenSlot.has(id)) {
      repairedSlots.push(`dedupe-slot-order:${id}`);
      continue;
    }
    seenSlot.add(id);
    nextOrder.push(id);
  }
  for (const id of widgetIds) {
    if (!nextOrder.includes(id)) {
      nextOrder.push(id);
      repairedSlots.push(`append-widget-slot:${id}`);
    }
  }

  const rowPackingNotes: string[] = [];
  let rowFill = 0;
  let rowCount = 1;
  for (const id of nextOrder) {
    const w = widgets.find((x) => x.id === id);
    if (!w) continue;
    let span = w.colSpan;
    if (span > 12) span = 12;
    if (rowFill + span > 12) {
      rowCount += 1;
      rowFill = span;
    } else {
      rowFill += span;
    }
  }
  rowPackingNotes.push(`Empaquetado xl:12 — ${rowCount} fila(s), última fila ${rowFill}/12 cols.`);

  const healthy =
    duplicateWidgetIds.length === 0 &&
    orphanSlotIds.length === 0 &&
    unknownBoxIds.length === 0 &&
    repairedSlots.length === 0;

  if (duplicateWidgetIds.length) {
    notes.push(`Widgets con ID duplicado en payload: ${duplicateWidgetIds.join(', ')}`);
  }
  if (unknownBoxIds.length) {
    notes.push(`boxId sin registro en boxCatalog: ${unknownBoxIds.join(', ')}`);
  }
  if (orphanSlotIds.length) {
    notes.push(`IDs en slotOrder sin widget: ${orphanSlotIds.join(', ')}`);
  }

  return {
    report: {
      healthy,
      repairedSlots,
      orphanSlotIds,
      duplicateWidgetIds,
      unknownBoxIds,
      rowPackingNotes,
      notes,
    },
    widgets,
    slotOrder: nextOrder,
  };
}

/** Conteo de slots que requerirían reparación (misma lógica que Commander, sin mutar estado). */
export function validateLayoutSanity(input: {
  widgets: DashboardWidget[];
  slotOrder?: string[];
}): {
  repairedSlotsCount: number;
  healthy: boolean;
  report: CommanderLayoutSanityReport;
} {
  const { report } = applyLayoutSanityForCommander(input);
  return {
    repairedSlotsCount: report.repairedSlots.length,
    healthy: report.healthy,
    report,
  };
}
