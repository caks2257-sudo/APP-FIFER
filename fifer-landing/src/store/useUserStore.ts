/**
 * User DNA Engine — preferencias, visibilidad de módulos e historial de navegación layout.
 * Persistencia: `localStorage` (`FIFER_USER_DNA_KEY`).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const FIFER_USER_DNA_KEY = "fifer-user-dna";

export type UserLocale = "es" | "en";
export type UserCurrency = "UF" | "CLP";

export interface UserPreferences {
  locale: UserLocale;
  currency: UserCurrency;
}

export interface UserProfile {
  displayName: string;
  role?: string;
  /** Identificador de persona / segmento (p. ej. demo). */
  persona?: string;
}

export interface LayoutHistoryEntry {
  at: number;
  moduleId: string;
  routePath: string;
}

/** Contexto de navegación contextual (sidebar, priorización Chicureo / ABKupfer). */
export type NavigationContextState =
  | { kind: "general" }
  | { kind: "module"; moduleId: string; routePath?: string };

/** Favorito de Box para acceso rápido en sidebar. */
export interface FavoriteBoxLink {
  /** Estable: `boxId`. */
  id: string;
  boxId: string;
  label: string;
  href: string;
}

const MAX_LAYOUT_HISTORY = 50;
const MAX_DNA_NUGGETS = 80;
const MAX_SEARCH_INTEREST_SIGNALS = 40;

/** Pautas para Neural Alerts (p. ej. revisión finanzas los lunes). Alineable con `_xray_USER_DNA.md`. */
export interface NeuralScheduleHints {
  /** `Date.getDay()`: 0 domingo … 6 sábado. Por defecto lunes = revisión Chicureo. */
  financeReviewWeekday: number;
}

interface UserState {
  profile: UserProfile;
  preferences: UserPreferences;
  /** IDs de `ModuleConfig.id` visibles en sidebar; `[]` = sin filtro explito (ver hook de resolución). */
  activeModules: string[];
  layoutHistory: LayoutHistoryEntry[];
  /** Módulo / ruta mental activa (Living OS contextual). */
  currentContext: NavigationContextState;
  /** Secciones colapsables de la sidebar (id → expandido). */
  sidebarExpandedSections: Record<string, boolean>;
  /** Boxes marcados como favoritos (parte superior de la sidebar). */
  favoriteBoxes: FavoriteBoxLink[];
  /** Plan PRO — activa Etapa 2 (motor de pago) en el Dual-Stage Pipeline del AI Director. */
  isPremium: boolean;
  /** BYOK / clave propia — misma semántica que PRO para Etapa 2. */
  hasCustomKey: boolean;
  /**
   * Pepitas de conocimiento (aprendizaje pasivo) — inyectadas junto al `_xray_USER_DNA.md` en el AI Director.
   */
  dnaKnowledgeNuggets: string[];
  /** Horarios / días preferidos para disparos proactivos. */
  neuralSchedule: NeuralScheduleHints;
  /** Última visita por `moduleId` (ms epoch). */
  moduleLastVisitAt: Record<string, number>;
  /** Términos derivados de comandos / búsquedas (ABKupfer, cruces con stock). */
  searchInterestSignals: string[];
}

interface UserStore extends UserState {
  setPreferences: (p: Partial<UserPreferences>) => void;
  setProfile: (p: Partial<UserProfile>) => void;
  setActiveModules: (ids: string[]) => void;
  pushLayoutHistory: (entry: Omit<LayoutHistoryEntry, "at">) => void;
  clearLayoutHistory: () => void;
  setCurrentContext: (ctx: NavigationContextState) => void;
  setSidebarSectionExpanded: (sectionId: string, expanded: boolean) => void;
  toggleSidebarSection: (sectionId: string) => void;
  addFavoriteBox: (entry: Omit<FavoriteBoxLink, "id"> & { id?: string }) => void;
  removeFavoriteBox: (boxId: string) => void;
  toggleFavoriteBox: (payload: { boxId: string; label: string; href: string }) => void;
  isFavoriteBox: (boxId: string) => boolean;
  setIsPremium: (value: boolean) => void;
  setHasCustomKey: (value: boolean) => void;
  /** Añade una línea de pepita (prefijo fecha ISO); máx. 80 entradas. */
  appendDnaNugget: (line: string) => void;
  recordModuleVisit: (moduleId: string) => void;
  /** Registra tokens de interés desde texto libre (Commander, búsqueda). */
  appendSearchInterestSignal: (raw: string) => void;
}

const defaultState: UserState = {
  profile: { displayName: "", role: undefined, persona: undefined },
  preferences: { locale: "es", currency: "CLP" },
  activeModules: [],
  layoutHistory: [],
  currentContext: { kind: "general" },
  sidebarExpandedSections: {},
  favoriteBoxes: [],
  isPremium: false,
  hasCustomKey: false,
  dnaKnowledgeNuggets: [],
  neuralSchedule: { financeReviewWeekday: 1 },
  moduleLastVisitAt: {},
  searchInterestSignals: [],
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setPreferences: (p) =>
        set((s) => ({
          preferences: { ...s.preferences, ...p },
        })),

      setProfile: (p) =>
        set((s) => ({
          profile: { ...s.profile, ...p },
        })),

      setActiveModules: (ids) => set({ activeModules: Array.from(new Set(ids)) }),

      pushLayoutHistory: (entry) => {
        const row: LayoutHistoryEntry = { ...entry, at: Date.now() };
        set((s) => ({
          layoutHistory: [row, ...s.layoutHistory].slice(0, MAX_LAYOUT_HISTORY),
        }));
      },

      clearLayoutHistory: () => set({ layoutHistory: [] }),

      setCurrentContext: (ctx) => set({ currentContext: ctx }),

      setSidebarSectionExpanded: (sectionId, expanded) =>
        set((s) => ({
          sidebarExpandedSections: { ...s.sidebarExpandedSections, [sectionId]: expanded },
        })),

      toggleSidebarSection: (sectionId) =>
        set((s) => ({
          sidebarExpandedSections: {
            ...s.sidebarExpandedSections,
            [sectionId]: !s.sidebarExpandedSections[sectionId],
          },
        })),

      addFavoriteBox: (entry) => {
        const id = entry.id ?? entry.boxId;
        set((s) => {
          if (s.favoriteBoxes.some((f) => f.boxId === entry.boxId)) return s;
          const row: FavoriteBoxLink = {
            id,
            boxId: entry.boxId,
            label: entry.label,
            href: entry.href,
          };
          return { favoriteBoxes: [row, ...s.favoriteBoxes].slice(0, 24) };
        });
      },

      removeFavoriteBox: (boxId) =>
        set((s) => ({
          favoriteBoxes: s.favoriteBoxes.filter((f) => f.boxId !== boxId),
        })),

      toggleFavoriteBox: (payload) =>
        set((s) => {
          const exists = s.favoriteBoxes.some((f) => f.boxId === payload.boxId);
          if (exists) {
            return { favoriteBoxes: s.favoriteBoxes.filter((f) => f.boxId !== payload.boxId) };
          }
          const row: FavoriteBoxLink = {
            id: payload.boxId,
            boxId: payload.boxId,
            label: payload.label,
            href: payload.href,
          };
          return { favoriteBoxes: [row, ...s.favoriteBoxes].slice(0, 24) };
        }),

      isFavoriteBox: (boxId) => get().favoriteBoxes.some((f) => f.boxId === boxId),

      setIsPremium: (value) => set({ isPremium: value }),

      setHasCustomKey: (value) => set({ hasCustomKey: value }),

      appendDnaNugget: (line) => {
        const t = line.trim();
        if (!t) return;
        const stamp = new Date().toISOString().slice(0, 10);
        const row = `${stamp} · ${t.slice(0, 400)}`;
        set((s) => ({
          dnaKnowledgeNuggets: [row, ...s.dnaKnowledgeNuggets].slice(0, MAX_DNA_NUGGETS),
        }));
      },

      recordModuleVisit: (moduleId) => {
        const id = String(moduleId || "")
          .toLowerCase()
          .trim();
        if (!id) return;
        set((s) => ({
          moduleLastVisitAt: { ...s.moduleLastVisitAt, [id]: Date.now() },
        }));
      },

      appendSearchInterestSignal: (raw) => {
        const t = String(raw || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (t.length < 3) return;
        const stop = new Set([
          "los",
          "las",
          "una",
          "como",
          "para",
          "todo",
          "ampliar",
          "colapsar",
          "mover",
          "ver",
        ]);
        const tokens = t
          .split(/[\s,/]+/)
          .map((w) => w.replace(/[^a-z0-9áéíóúñü-]/gi, ""))
          .filter((w) => w.length >= 3 && !stop.has(w));
        if (!tokens.length) return;
        set((s) => {
          const merged = Array.from(new Set([...tokens, ...s.searchInterestSignals]));
          return { searchInterestSignals: merged.slice(0, MAX_SEARCH_INTEREST_SIGNALS) };
        });
      },
    }),
    {
      name: FIFER_USER_DNA_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        } as unknown as Storage;
      }),
      partialize: (s) => ({
        profile: s.profile,
        preferences: s.preferences,
        activeModules: s.activeModules,
        layoutHistory: s.layoutHistory,
        currentContext: s.currentContext,
        sidebarExpandedSections: s.sidebarExpandedSections,
        favoriteBoxes: s.favoriteBoxes,
        isPremium: s.isPremium,
        hasCustomKey: s.hasCustomKey,
        dnaKnowledgeNuggets: s.dnaKnowledgeNuggets,
        neuralSchedule: s.neuralSchedule,
        moduleLastVisitAt: s.moduleLastVisitAt,
        searchInterestSignals: s.searchInterestSignals,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<UserState> | null;
        if (!p) return current as UserStore;
        return {
          ...(current as UserStore),
          profile: { ...defaultState.profile, ...p.profile },
          preferences: { ...defaultState.preferences, ...p.preferences },
          activeModules: Array.isArray(p.activeModules) ? p.activeModules : [],
          layoutHistory: Array.isArray(p.layoutHistory) ? p.layoutHistory.slice(0, MAX_LAYOUT_HISTORY) : [],
          currentContext:
            p.currentContext && typeof p.currentContext === "object" && "kind" in p.currentContext
              ? p.currentContext
              : defaultState.currentContext,
          sidebarExpandedSections:
            p.sidebarExpandedSections && typeof p.sidebarExpandedSections === "object"
              ? p.sidebarExpandedSections
              : {},
          favoriteBoxes: Array.isArray(p.favoriteBoxes) ? p.favoriteBoxes.slice(0, 24) : [],
          isPremium: typeof p.isPremium === "boolean" ? p.isPremium : false,
          hasCustomKey: typeof p.hasCustomKey === "boolean" ? p.hasCustomKey : false,
          dnaKnowledgeNuggets: Array.isArray(p.dnaKnowledgeNuggets)
            ? p.dnaKnowledgeNuggets.slice(0, MAX_DNA_NUGGETS)
            : [],
          neuralSchedule:
            p.neuralSchedule &&
            typeof p.neuralSchedule === "object" &&
            typeof (p.neuralSchedule as NeuralScheduleHints).financeReviewWeekday === "number"
              ? (p.neuralSchedule as NeuralScheduleHints)
              : defaultState.neuralSchedule,
          moduleLastVisitAt:
            p.moduleLastVisitAt && typeof p.moduleLastVisitAt === "object" ? p.moduleLastVisitAt : {},
          searchInterestSignals: Array.isArray(p.searchInterestSignals)
            ? p.searchInterestSignals.slice(0, MAX_SEARCH_INTEREST_SIGNALS)
            : [],
        };
      },
    }
  )
);
