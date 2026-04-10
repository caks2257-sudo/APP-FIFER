/**
 * Fifer Scene Engine — escenas objetivo (CONSTRUCCIÓN · COMERCIAL · ESTRATEGIA).
 * Reordena `slotOrder` y fija expansión hero según prioridad semántica por `boxId`.
 */
import type { FiferBoxId, UserBoxLayoutEntry } from "@/types/fifer-box";
import { flowPositionsForSlot, HERO_COL_SPAN, HERO_ROW_SPAN } from "@/store/layout-flow";

/** Slice de layout por ruta (misma forma que en `useLayoutStore`). */
export interface SceneLayoutSlice {
  userLayout: Record<FiferBoxId, UserBoxLayoutEntry>;
  slotOrder: Record<string, FiferBoxId[]>;
}

export type FiferScene = "CONSTRUCCIÓN" | "COMERCIAL" | "ESTRATEGIA";

export const FIFER_SCENE_LABELS: Record<FiferScene, string> = {
  CONSTRUCCIÓN: "Construcción — planos, Chicureo y trámites",
  COMERCIAL: "Comercial — stock ABKupfer y campañas",
  ESTRATEGIA: "Estrategia — ROI, finanzas y KPI",
};

/** Prioridad numérica mayor = más relevante para la escena. */
function scoreBoxForScene(boxId: string, scene: FiferScene): number {
  const id = boxId.toLowerCase();
  switch (scene) {
    case "CONSTRUCCIÓN":
      if (/vision|plano|factura|obra|chicureo|trámite|tramite|proyecto|permiso|bim|lote/i.test(id)) return 100;
      if (/kpi|insight|ia|system-ia/i.test(id)) return 55;
      if (/finance|cash|transaction|auditor/i.test(id)) return 35;
      if (/content|ingest|shopping|gallery|stock|campaign|brand/i.test(id)) return 25;
      return 10;
    case "COMERCIAL":
      if (/content|ingest|shopping|gallery|stock|campaign|brand|abkupfer|google-shopping/i.test(id)) return 100;
      if (/kpi|insight|ia/i.test(id)) return 60;
      if (/finance|cash|transaction/i.test(id)) return 40;
      if (/chicureo|plano|tramite|obra/i.test(id)) return 25;
      return 10;
    case "ESTRATEGIA":
      if (/finance|cash|transaction|roi|kpi|insight|auditor|chart|grid/i.test(id)) return 100;
      if (/global-kpi|system-ia/i.test(id)) return 88;
      if (/content|ingest|shopping|gallery/i.test(id)) return 35;
      if (/chicureo|plano|tramite/i.test(id)) return 22;
      return 10;
    default:
      return 0;
  }
}

function sortIdsForScene(ids: FiferBoxId[], scene: FiferScene): FiferBoxId[] {
  return [...ids].sort((a, b) => scoreBoxForScene(b, scene) - scoreBoxForScene(a, scene));
}

/** Expande hasta 2 cajas con la puntuación máxima (hero); el resto colapsa. */
function pickExpandedIds(sorted: FiferBoxId[], scene: FiferScene): Set<FiferBoxId> {
  if (!sorted.length) return new Set();
  const scores = sorted.map((id) => ({ id, s: scoreBoxForScene(id, scene) }));
  const maxScore = Math.max(...scores.map((x) => x.s), 0);
  const top = scores.filter((x) => x.s === maxScore).map((x) => x.id);
  if (maxScore <= 0) return new Set(sorted[0] ? [sorted[0]] : []);
  return new Set(top.slice(0, 2));
}

export function applySceneTransform(slice: SceneLayoutSlice, scene: FiferScene): SceneLayoutSlice {
  const nextUserLayout: Record<FiferBoxId, UserBoxLayoutEntry> = { ...slice.userLayout };
  const nextSlotOrder: Record<string, FiferBoxId[]> = {};

  for (const [slotName, order] of Object.entries(slice.slotOrder)) {
    if (!order?.length) {
      nextSlotOrder[slotName] = order;
      continue;
    }
    const sorted = sortIdsForScene(order, scene);
    const expandSet = pickExpandedIds(sorted, scene);

    for (const id of sorted) {
      const e = nextUserLayout[id];
      if (!e || e.slotName !== slotName) continue;
      const expand = expandSet.has(id);
      nextUserLayout[id] = {
        ...e,
        isExpanded: expand,
        colSpan: expand ? HERO_COL_SPAN : e.baseColSpan,
        rowSpan: expand ? HERO_ROW_SPAN : e.baseRowSpan,
      };
    }
    const flowed = flowPositionsForSlot(sorted, nextUserLayout, slotName);
    for (const [k, v] of Object.entries(flowed)) {
      nextUserLayout[k] = v;
    }
    nextSlotOrder[slotName] = sorted;
  }

  return { userLayout: nextUserLayout, slotOrder: nextSlotOrder };
}

const SCENE_ALIASES: Record<string, FiferScene> = {
  construcción: "CONSTRUCCIÓN",
  construccion: "CONSTRUCCIÓN",
  construction: "CONSTRUCCIÓN",
  obra: "CONSTRUCCIÓN",
  comercial: "COMERCIAL",
  commercial: "COMERCIAL",
  ventas: "COMERCIAL",
  estrategia: "ESTRATEGIA",
  strategy: "ESTRATEGIA",
  finanzas: "ESTRATEGIA",
  roi: "ESTRATEGIA",
};

export function parseSceneName(raw: string): FiferScene | null {
  const k = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!k) return null;
  return SCENE_ALIASES[k] ?? null;
}
