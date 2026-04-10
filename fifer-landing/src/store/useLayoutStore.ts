/**
 * Living OS Core — estado de layout por ruta (`userLayout`, `slotOrder`).
 *
 * - Persistencia: `localStorage` vía middleware `persist` de Zustand (clave `FIFER_LAYOUT_PERSIST_KEY`).
 * - Consumo: `PageOrchestrator` + comandos IA (`ui-commander`). Contrato: `_xray_PROTOCOL_SHELL.md` y `.cursorrules` §0.
 */
import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  findBoxInLayoutSlice,
  parseUICommandInput,
  type CommanderContext,
  type UICommandResult,
} from "@/lib/ui-commander";
import type { FiferBoxId, IFiferBoxManifest, UserBoxLayoutEntry } from "@/types/fifer-box";
import { baseDimensionsFromManifest } from "@/types/fifer-box";
import type { SlotDictionary } from "@/types/architecture";
import { FIFER_BOX_CATALOG, FIFER_BOX_CATALOG_BY_ID } from "@/registry/box-catalog";
import { validateLayoutSanity as validateLayoutAgainstRouteMetadata } from "@/store/layout-sanity";
import { flowPositionsForSlot, HERO_COL_SPAN, HERO_ROW_SPAN } from "@/store/layout-flow";
import { applySceneTransform, type FiferScene } from "@/store/scene-engine";

export type { UICommandResult } from "@/lib/ui-commander";
export type { FiferScene } from "@/store/scene-engine";

/** Clave en `localStorage` para el slice persistido (`routes` → incluye `userLayout`). */
export const FIFER_LAYOUT_PERSIST_KEY = "fifer-layout-store";

/** Vista derivada para el orquestador (compat grid CSS: width/height = colSpan/rowSpan). */
export interface BoxLayoutState {
  id: FiferBoxId;
  slotName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  expanded: boolean;
  baseWidth: number;
  baseHeight: number;
  showAIFace?: boolean;
}

export interface RouteLayoutSlice {
  /** Mapa boxId → disposición persistida (memoria de layout). */
  userLayout: Record<FiferBoxId, UserBoxLayoutEntry>;
  /** Orden de cajas por slot (DnD / metadata). */
  slotOrder: Record<string, FiferBoxId[]>;
}

export function makeRouteKey(moduleId: string, routePath: string): string {
  const path = String(routePath || "/").replace(/\/+$/, "") || "/";
  return `${String(moduleId || "").toLowerCase()}::${path}`;
}

export function entryToBoxState(id: FiferBoxId, e: UserBoxLayoutEntry): BoxLayoutState {
  return {
    id,
    slotName: e.slotName,
    x: e.x,
    y: e.y,
    width: e.colSpan,
    height: e.rowSpan,
    expanded: e.isExpanded,
    baseWidth: e.baseColSpan,
    baseHeight: e.baseRowSpan,
    showAIFace: e.showAIFace,
  };
}

function createBoxEntry(
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

function mergeSlotWithMetadata(
  previousLayout: Record<FiferBoxId, UserBoxLayoutEntry> | undefined,
  previousOrder: FiferBoxId[] | undefined,
  slotName: string,
  boxIds: FiferBoxId[],
  manifests: Partial<Record<string, IFiferBoxManifest>> | undefined
): { userLayout: Record<FiferBoxId, UserBoxLayoutEntry>; order: FiferBoxId[] } {
  const prevById = new Map((previousLayout ? Object.entries(previousLayout) : []).map(([k, v]) => [k, v]));
  const mergedLayout: Record<FiferBoxId, UserBoxLayoutEntry> = { ...(previousLayout || {}) };
  const order: FiferBoxId[] = [];

  boxIds.forEach((id, idx) => {
    const manifest = manifests?.[id];
    const existing = prevById.get(id);
    if (existing && existing.slotName === slotName) {
      const { baseWidth, baseHeight } = baseDimensionsFromManifest(manifest);
      const bw = existing.baseColSpan ?? baseWidth;
      const bh = existing.baseRowSpan ?? baseHeight;
      mergedLayout[id] = {
        ...existing,
        baseColSpan: bw,
        baseRowSpan: bh,
        isExpanded: existing.isExpanded,
        colSpan: existing.isExpanded ? HERO_COL_SPAN : bw,
        rowSpan: existing.isExpanded ? HERO_ROW_SPAN : bh,
        slotName,
      };
    } else {
      mergedLayout[id] = createBoxEntry(id, slotName, manifest, idx);
    }
    order.push(id);
  });

  if (previousOrder?.length) {
    const prevSet = new Set(boxIds);
    const preserved = previousOrder.filter((id) => prevSet.has(id));
    const tail = boxIds.filter((id) => !preserved.includes(id));
    const mergedOrder = [...preserved, ...tail];
    const flowed = flowPositionsForSlot(mergedOrder, mergedLayout, slotName);
    return { userLayout: flowed, order: mergedOrder };
  }

  const flowed = flowPositionsForSlot(order, mergedLayout, slotName);
  return { userLayout: flowed, order };
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
  Array.from(validIds).forEach((id) => {
    if (userLayout[id]) next[id] = userLayout[id];
  });
  return next;
}

interface LayoutStoreState {
  routes: Record<string, RouteLayoutSlice>;
  commanderContext: CommanderContext | null;
  lastCommandResult: UICommandResult | null;
  /**
   * Integraciones: qué `boxId` reportan HTTP 401 activo (Discovery / bridge).
   * No persistido — alimenta prioridad `/reparar-credenciales` en Spotlight.
   */
  integration401ByBox: Record<string, boolean>;
  /**
   * `true`: semillas / mocks (`src/mocks`). `false`: intentar datos reales (API / DB según módulo).
   * Persistido en localStorage junto a `routes`.
   */
  isDemoMode: boolean;
  /**
   * Carga global (p. ej. IA pensando en Commander) — activa pulso THINKING en `AmbientFeedback`.
   * No persistido.
   */
  isLoading: boolean;
  /**
   * Timestamp del último `pulseSuccess()` — destello SUCCESS (no persistido).
   */
  successPulseAt: number;
  /**
   * Escena objetivo (Fifer Scene Engine) — prioriza tipos de caja y expansión hero.
   * Persistido con el layout.
   */
  fiferScene: FiferScene;
  /**
   * Última metadata de hidratación por ruta — para `/limpiar-layout` sin borrar datos de usuario.
   * No persistido.
   */
  routeHydrationCache: Record<
    string,
    { slots: SlotDictionary; manifests?: Partial<Record<string, IFiferBoxManifest>> }
  >;
}

interface LayoutStore extends LayoutStoreState {
  initFromMetadata: (
    moduleId: string,
    routePath: string,
    slots: SlotDictionary,
    manifests?: Partial<Record<string, IFiferBoxManifest>>
  ) => void;
  /** Actualiza coordenadas y/o spans del `userLayout` para un boxId. */
  updateLayout: (
    moduleId: string,
    routePath: string,
    slotName: string,
    boxId: FiferBoxId,
    patch: Partial<
      Pick<UserBoxLayoutEntry, "x" | "y" | "colSpan" | "rowSpan" | "isExpanded" | "baseColSpan" | "baseRowSpan">
    >
  ) => void;
  /** Hidratación JIT: aplica `manifest.layout` del motor al slot (grid 12) sin reiniciar la ruta. */
  applyPartialEngineManifest: (
    moduleId: string,
    routePath: string,
    slotName: string,
    boxId: FiferBoxId,
    manifest: Partial<IFiferBoxManifest>
  ) => void;
  /** Alterna la vista “flip” IA (`showAIFace`) para una caja. */
  toggleAIView: (moduleId: string, routePath: string, slotName: string, boxId: FiferBoxId) => void;
  toggleBoxExpansion: (moduleId: string, routePath: string, slotName: string, boxId: FiferBoxId) => void;
  reorderBoxInSlot: (
    moduleId: string,
    routePath: string,
    slotName: string,
    activeId: string,
    overId: string
  ) => void;
  getSlotBoxes: (moduleId: string, routePath: string, slotName: string) => BoxLayoutState[] | undefined;
  setCommanderContext: (ctx: CommanderContext | null) => void;
  /** Marca o limpia 401 por caja (montaje BoxLoader / heal). */
  setBoxIntegration401: (boxId: string, active: boolean) => void;
  clearIntegration401Flags: () => void;
  executeUICommand: (input: string) => UICommandResult;
  toggleDemoMode: () => void;
  setLoading: (value: boolean) => void;
  /** Destello verde esmeralda (ROI, hitos). */
  pulseSuccess: () => void;
  /** Cambia la escena global; `PageOrchestrator` reaplica layout al montar / al cambiar escena. */
  setFiferScene: (scene: FiferScene) => void;
  /** Aplica la escena actual al slice de la ruta (reordenar + expandir/colapsar). */
  applySceneToRoute: (moduleId: string, routePath: string) => void;
  /**
   * Re-ejecuta `validateLayoutAgainstRouteMetadata` en la vista del Commander (solo layout persistido).
   */
  applyLayoutSanityForCommander: () => { ok: boolean; message: string };
}

function mutateRouteExpandCollapseAll(
  set: (fn: (s: LayoutStore) => Partial<LayoutStore> | LayoutStore) => void,
  routeKey: string,
  expand: boolean
): void {
  set((s) => {
    const slice = s.routes[routeKey];
    if (!slice) return s;
    let userLayout = { ...slice.userLayout };
    for (const slotName of Object.keys(slice.slotOrder)) {
      const order = slice.slotOrder[slotName] || [];
      for (const id of order) {
        const e = userLayout[id];
        if (!e) continue;
        userLayout[id] = expand
          ? {
              ...e,
              isExpanded: true,
              colSpan: HERO_COL_SPAN,
              rowSpan: HERO_ROW_SPAN,
            }
          : {
              ...e,
              isExpanded: false,
              colSpan: e.baseColSpan,
              rowSpan: e.baseRowSpan,
            };
      }
      const flowed = flowPositionsForSlot(order, userLayout, slotName);
      userLayout = { ...userLayout, ...flowed };
    }
    return {
      routes: {
        ...s.routes,
        [routeKey]: { ...slice, userLayout },
      },
    };
  });
}

/** `boxId` válidos estrictos según catálogo core actual. */
function buildAllowedBoxIdSet(): Set<string> {
  const out = new Set<string>();
  for (const m of FIFER_BOX_CATALOG) out.add(m.boxId);
  return out;
}

/**
 * Asegura spans y origen dentro del grid 12×6 (Protocolo Shell).
 */
function clampEntryToGrid12(boxId: string, e: UserBoxLayoutEntry): UserBoxLayoutEntry {
  const maxCol = 12;
  const maxRow = 6;
  const minFromCatalog = Math.max(1, Math.min(12, FIFER_BOX_CATALOG_BY_ID[boxId]?.layout.minWidth ?? 4));
  let baseCol = Math.min(maxCol, Math.max(minFromCatalog, Math.round(Number(e.baseColSpan) || minFromCatalog)));
  let baseRow = Math.min(maxRow, Math.max(1, Math.round(Number(e.baseRowSpan) || 1)));
  const x = Math.max(0, Math.min(11, Math.floor(Number(e.x) || 0)));
  const y = Math.max(0, Math.floor(Number(e.y) || 0));
  const expanded = Boolean(e.isExpanded);
  if (expanded) {
    return {
      ...e,
      x,
      y,
      baseColSpan: baseCol,
      baseRowSpan: baseRow,
      isExpanded: true,
      colSpan: HERO_COL_SPAN,
      rowSpan: HERO_ROW_SPAN,
    };
  }
  let colSpan = Math.min(maxCol, Math.max(minFromCatalog, Math.round(Number(e.colSpan) || baseCol)));
  const rowSpan = Math.min(maxRow, Math.max(1, Math.round(Number(e.rowSpan) || baseRow)));
  if (x + colSpan > maxCol) colSpan = Math.max(1, maxCol - x);
  baseCol = Math.min(baseCol, colSpan);
  baseRow = Math.min(baseRow, rowSpan);
  return {
    ...e,
    x,
    y,
    baseColSpan: baseCol,
    baseRowSpan: baseRow,
    isExpanded: false,
    colSpan,
    rowSpan,
  };
}

/**
 * Capa 6 — Sanación al hidratar desde `localStorage`: elimina `boxId` desconocidos y recorta al grid 12 cols.
 */
export function validateLayoutSanity(routes: Record<string, RouteLayoutSlice>): Record<string, RouteLayoutSlice> {
  const allowed = buildAllowedBoxIdSet();
  const out: Record<string, RouteLayoutSlice> = {};
  for (const [routeKey, slice] of Object.entries(routes || {})) {
    const slotOrder: Record<string, FiferBoxId[]> = {};
    for (const [slotName, ids] of Object.entries(slice.slotOrder || {})) {
      slotOrder[slotName] = (ids || []).filter((id) => allowed.has(id));
    }
    const userLayout: Record<FiferBoxId, UserBoxLayoutEntry> = {};
    for (const [id, entry] of Object.entries(slice.userLayout || {})) {
      if (!allowed.has(id)) continue;
      userLayout[id] = clampEntryToGrid12(id, entry);
    }
    for (const slotName of Object.keys(slotOrder)) {
      slotOrder[slotName] = (slotOrder[slotName] || []).filter((id) => Boolean(userLayout[id]));
    }
    for (const id of Object.keys(userLayout)) {
      const listed = Object.values(slotOrder).some((arr) => arr.includes(id));
      if (!listed) delete userLayout[id];
    }
    out[routeKey] = { userLayout, slotOrder };
  }
  return out;
}

function reorderBoxToFirstInSlot(
  set: (fn: (s: LayoutStore) => Partial<LayoutStore> | LayoutStore) => void,
  routeKey: string,
  slotName: string,
  boxId: string
): void {
  set((s) => {
    const slice = s.routes[routeKey];
    const list = slice?.slotOrder[slotName];
    if (!list?.length) return s;
    const i = list.indexOf(boxId);
    if (i <= 0) return s;
    const nextOrder = arrayMove(list, i, 0) as FiferBoxId[];
    const flowed = flowPositionsForSlot(nextOrder, slice.userLayout, slotName);
    return {
      routes: {
        ...s.routes,
        [routeKey]: {
          ...slice!,
          slotOrder: { ...slice!.slotOrder, [slotName]: nextOrder },
          userLayout: { ...slice!.userLayout, ...flowed },
        },
      },
    };
  });
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      routes: {},
      commanderContext: null,
      lastCommandResult: null,
      integration401ByBox: {},
      isDemoMode: true,
      isLoading: false,
      successPulseAt: 0,
      fiferScene: "COMERCIAL",
      routeHydrationCache: {},

      setFiferScene: (scene) => set({ fiferScene: scene }),

      applyLayoutSanityForCommander: () => {
        const ctx = get().commanderContext;
        if (!ctx) {
          return { ok: false, message: "Sin contexto de vista. Abre un módulo del dashboard." };
        }
        const key = makeRouteKey(ctx.moduleId, ctx.routePath);
        const snap = get().routeHydrationCache[key];
        if (!snap) {
          return {
            ok: false,
            message: "Metadata de layout no disponible. Navega de nuevo a esta ruta del dashboard.",
          };
        }
        const slice = get().routes[key];
        if (!slice) {
          return { ok: false, message: "No hay layout persistido para esta ruta." };
        }
        const next = validateLayoutAgainstRouteMetadata(slice, snap.slots, snap.manifests);
        set((s) => ({
          routes: {
            ...s.routes,
            [key]: { userLayout: next.userLayout, slotOrder: next.slotOrder },
          },
        }));
        if (next.repairedSlots.length) {
          return {
            ok: true,
            message: `Layout sanado: slots reparados → ${next.repairedSlots.join(", ")}.`,
          };
        }
        return { ok: true, message: "Layout comprobado: sin solapes ni boxIds inválidos respecto al catálogo." };
      },

      applySceneToRoute: (moduleId, routePath) => {
        const key = makeRouteKey(moduleId, routePath);
        set((s) => {
          const slice = s.routes[key];
          if (!slice) return s;
          const next = applySceneTransform(slice, s.fiferScene);
          return {
            routes: {
              ...s.routes,
              [key]: next,
            },
          };
        });
      },

      toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),

      setLoading: (value) => set({ isLoading: value }),

      pulseSuccess: () => set({ successPulseAt: Date.now() }),

      setCommanderContext: (ctx) => set({ commanderContext: ctx }),

      setBoxIntegration401: (boxId, active) =>
        set((s) => {
          const next = { ...s.integration401ByBox };
          if (active) next[boxId] = true;
          else delete next[boxId];
          return { integration401ByBox: next };
        }),

      clearIntegration401Flags: () => set({ integration401ByBox: {} }),

      executeUICommand: (input: string): UICommandResult => {
        const parsed = parseUICommandInput(input);
        if (parsed.kind === "noop") {
          const r: UICommandResult = {
            ok: false,
            message: "Orden no reconocida. Ej.: ampliar finanzas · mover reporte al inicio · colapsar todo",
          };
          set({ lastCommandResult: r });
          return r;
        }

        const fail = (message: string): UICommandResult => {
          const r: UICommandResult = { ok: false, message };
          set({ lastCommandResult: r });
          return r;
        };
        const ok = (message: string): UICommandResult => {
          const r: UICommandResult = { ok: true, message };
          set({ lastCommandResult: r });
          return r;
        };

        const ctx = get().commanderContext;

        const ensureSlice = (moduleId: string, routePath: string) => {
          const key = makeRouteKey(moduleId, routePath);
          const slice = get().routes[key];
          if (!slice) return { key, slice: null as RouteLayoutSlice | null };
          return { key, slice };
        };

        switch (parsed.kind) {
          case "expand_all_current": {
            if (!ctx) return fail("Sin contexto de vista. Entra a un módulo del dashboard.");
            const { key, slice } = ensureSlice(ctx.moduleId, ctx.routePath);
            if (!slice) return fail("Layout aún no cargado en esta vista. Espera un instante o recarga.");
            mutateRouteExpandCollapseAll(set, key, true);
            return ok("Cajas ampliadas en la vista actual.");
          }
          case "expand_module": {
            const { key, slice } = ensureSlice(parsed.moduleId, parsed.routePath);
            if (!slice) {
              return fail(
                `No hay datos de layout para «${parsed.moduleId}». Abre esa ruta una vez para inicializarla.`
              );
            }
            mutateRouteExpandCollapseAll(set, key, true);
            return ok(`Cajas ampliadas en ${parsed.moduleId}.`);
          }
          case "collapse_all_current": {
            if (!ctx) return fail("Sin contexto de vista. Entra a un módulo del dashboard.");
            const { key, slice } = ensureSlice(ctx.moduleId, ctx.routePath);
            if (!slice) return fail("Layout aún no cargado en esta vista.");
            mutateRouteExpandCollapseAll(set, key, false);
            return ok("Cajas reducidas a tamaño estándar en la vista actual.");
          }
          case "collapse_module": {
            const { key, slice } = ensureSlice(parsed.moduleId, parsed.routePath);
            if (!slice) {
              return fail(
                `No hay datos de layout para «${parsed.moduleId}». Abre esa ruta una vez para inicializarla.`
              );
            }
            mutateRouteExpandCollapseAll(set, key, false);
            return ok(`Cajas reducidas en ${parsed.moduleId}.`);
          }
          case "move_to_start": {
            if (!ctx) return fail("Sin contexto de vista. Entra a un módulo del dashboard.");
            const { key, slice } = ensureSlice(ctx.moduleId, ctx.routePath);
            if (!slice) return fail("Layout aún no cargado en esta vista.");
            const found = findBoxInLayoutSlice(slice, parsed.subject);
            if (!found) {
              return fail(`No encontré una caja que coincida con «${parsed.subject}».`);
            }
            reorderBoxToFirstInSlot(set, key, found.slotName, found.boxId);
            return ok(`«${found.boxId}» movido al inicio de ${found.slotName}.`);
          }
          default:
            return fail("Orden no soportada.");
        }
      },

      initFromMetadata: (moduleId, routePath, slots, manifests) => {
        const key = makeRouteKey(moduleId, routePath);
        const prev = get().routes[key];
        const validIds = collectAllBoxIds(slots);

        let userLayout: Record<FiferBoxId, UserBoxLayoutEntry> = { ...(prev?.userLayout || {}) };
        const slotOrder: Record<string, FiferBoxId[]> = { ...(prev?.slotOrder || {}) };

        for (const [slotName, boxIds] of Object.entries(slots || {})) {
          const ids = (boxIds || []) as FiferBoxId[];
          const { userLayout: merged, order } = mergeSlotWithMetadata(
            userLayout,
            prev?.slotOrder?.[slotName],
            slotName,
            ids,
            manifests
          );
          userLayout = { ...merged };
          slotOrder[slotName] = order;
        }

        for (const k of Object.keys(slotOrder)) {
          if (!(k in (slots || {}))) delete slotOrder[k];
        }

        userLayout = pruneUserLayout(userLayout, validIds);

        const sane = validateLayoutAgainstRouteMetadata({ userLayout, slotOrder }, slots, manifests);

        set((s) => ({
          routes: {
            ...s.routes,
            [key]: { userLayout: sane.userLayout, slotOrder: sane.slotOrder },
          },
          routeHydrationCache: {
            ...s.routeHydrationCache,
            [key]: { slots, manifests },
          },
        }));
      },

      applyPartialEngineManifest: (moduleId, routePath, slotName, boxId, manifest) => {
        if (!manifest.layout) return;
        const key = makeRouteKey(moduleId, routePath);
        const { baseWidth, baseHeight } = baseDimensionsFromManifest(manifest as IFiferBoxManifest);
        set((s) => {
          const slice = s.routes[key];
          if (!slice?.userLayout[boxId] || slice.userLayout[boxId].slotName !== slotName) return s;
          const cur = slice.userLayout[boxId];
          const next: UserBoxLayoutEntry = {
            ...cur,
            baseColSpan: baseWidth,
            baseRowSpan: baseHeight,
            colSpan: cur.isExpanded ? HERO_COL_SPAN : baseWidth,
            rowSpan: cur.isExpanded ? HERO_ROW_SPAN : baseHeight,
          };
          const userLayout = { ...slice.userLayout, [boxId]: next };
          const order = slice.slotOrder[slotName] || [];
          const flowed = flowPositionsForSlot(order, userLayout, slotName);
          return {
            routes: {
              ...s.routes,
              [key]: {
                ...slice,
                userLayout: { ...userLayout, ...flowed },
              },
            },
          };
        });
      },

      updateLayout: (moduleId, routePath, slotName, boxId, patch) => {
        const key = makeRouteKey(moduleId, routePath);
        set((s) => {
          const slice = s.routes[key];
          if (!slice?.userLayout[boxId] || slice.userLayout[boxId].slotName !== slotName) return s;
          const cur = slice.userLayout[boxId];
          const merged = { ...cur, ...patch, slotName };
          const nextEntry: UserBoxLayoutEntry =
            patch.isExpanded !== undefined
              ? {
                  ...merged,
                  colSpan: merged.isExpanded ? HERO_COL_SPAN : merged.baseColSpan,
                  rowSpan: merged.isExpanded ? HERO_ROW_SPAN : merged.baseRowSpan,
                }
              : patch.baseColSpan !== undefined || patch.baseRowSpan !== undefined
                ? {
                    ...merged,
                    colSpan: merged.isExpanded ? HERO_COL_SPAN : merged.baseColSpan,
                    rowSpan: merged.isExpanded ? HERO_ROW_SPAN : merged.baseRowSpan,
                  }
                : merged;
          const userLayout = { ...slice.userLayout, [boxId]: nextEntry };
          const order = slice.slotOrder[slotName] || [];
          const flowed = flowPositionsForSlot(order, userLayout, slotName);
          return {
            routes: {
              ...s.routes,
              [key]: {
                ...slice,
                userLayout: { ...userLayout, ...flowed },
              },
            },
          };
        });
      },

      toggleAIView: (moduleId, routePath, slotName, boxId) => {
        const key = makeRouteKey(moduleId, routePath);
        set((s) => {
          const slice = s.routes[key];
          const cur = slice?.userLayout[boxId];
          if (!cur || cur.slotName !== slotName) return s;
          const next: UserBoxLayoutEntry = {
            ...cur,
            showAIFace: !cur.showAIFace,
          };
          return {
            routes: {
              ...s.routes,
              [key]: {
                ...slice!,
                userLayout: { ...slice!.userLayout, [boxId]: next },
              },
            },
          };
        });
      },

      toggleBoxExpansion: (moduleId, routePath, slotName, boxId) => {
        const key = makeRouteKey(moduleId, routePath);
        set((s) => {
          const slice = s.routes[key];
          if (!slice?.userLayout[boxId]) return s;
          const cur = slice.userLayout[boxId];
          if (cur.slotName !== slotName) return s;
          const nextExpanded = !cur.isExpanded;
          const nextEntry: UserBoxLayoutEntry = {
            ...cur,
            isExpanded: nextExpanded,
            colSpan: nextExpanded ? HERO_COL_SPAN : cur.baseColSpan,
            rowSpan: nextExpanded ? HERO_ROW_SPAN : cur.baseRowSpan,
          };
          const userLayout = { ...slice.userLayout, [boxId]: nextEntry };
          const order = slice.slotOrder[slotName] || [];
          const flowed = flowPositionsForSlot(order, userLayout, slotName);
          return {
            routes: {
              ...s.routes,
              [key]: {
                ...slice,
                userLayout: { ...userLayout, ...flowed },
              },
            },
          };
        });
      },

      reorderBoxInSlot: (moduleId, routePath, slotName, activeId, overId) => {
        if (activeId === overId) return;
        const key = makeRouteKey(moduleId, routePath);
        set((s) => {
          const slice = s.routes[key];
          const list = slice?.slotOrder[slotName];
          if (!list?.length) return s;
          const oldIndex = list.indexOf(activeId);
          const newIndex = list.indexOf(overId);
          if (oldIndex < 0 || newIndex < 0) return s;
          const nextOrder = arrayMove(list, oldIndex, newIndex) as FiferBoxId[];
          const flowed = flowPositionsForSlot(nextOrder, slice.userLayout, slotName);
          return {
            routes: {
              ...s.routes,
              [key]: {
                ...slice!,
                slotOrder: { ...slice!.slotOrder, [slotName]: nextOrder },
                userLayout: { ...slice!.userLayout, ...flowed },
              },
            },
          };
        });
      },

      getSlotBoxes: (moduleId, routePath, slotName) => {
        const key = makeRouteKey(moduleId, routePath);
        const slice = get().routes[key];
        const order = slice?.slotOrder[slotName];
        if (!order?.length) return undefined;
        return order
          .map((id) => {
            const e = slice!.userLayout[id];
            return e ? entryToBoxState(id, e) : null;
          })
          .filter((b): b is BoxLayoutState => b !== null);
      },
    }),
    {
      name: FIFER_LAYOUT_PERSIST_KEY,
      /** `userLayout` vive dentro de `routes[routeKey]` — gravedad del lienzo 12 cols. */
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        } as unknown as Storage;
      }),
      partialize: (state) => ({
        routes: state.routes,
        isDemoMode: state.isDemoMode,
        fiferScene: state.fiferScene,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<LayoutStoreState, "routes" | "isDemoMode" | "fiferScene">> | null;
        if (!p) return current as LayoutStore;
        const scenes: FiferScene[] = ["CONSTRUCCIÓN", "COMERCIAL", "ESTRATEGIA"];
        const rawRoutes = p.routes ?? (current as LayoutStore).routes;
        return {
          ...(current as LayoutStore),
          routes: validateLayoutSanity(rawRoutes || {}),
          isDemoMode: typeof p.isDemoMode === "boolean" ? p.isDemoMode : true,
          fiferScene: scenes.includes(p.fiferScene as FiferScene) ? (p.fiferScene as FiferScene) : (current as LayoutStore).fiferScene,
        };
      },
    }
  )
);
