import { create } from 'zustand';

import type {
  CashFlowReport,
  FintocAccount,
} from '@/components/dashboard/widgets/contracts';
import type { WarRoomConfig } from '@/types/war-room';

/** Datos opcionales para pintar widgets financieros en el overlay. */
export type OverlayFinancePayload = {
  fintocAccount?: FintocAccount;
  cashFlowReport?: CashFlowReport;
};

interface UIState {
  activeOverlayWidgets: string[] | null;
  overlayFinance: OverlayFinancePayload | null;
  /** Payload serializable para `constructorWarRoom` (Smart War Room). */
  overlayWarRoomConfig: WarRoomConfig | null;
  /** Contexto lógico del overlay activo (p. ej. `ab-kupfer`). */
  overlayAppContext: string | null;
  /** Clave: nombre de negocio enviado a la factory; valor: provisión en curso. */
  provisioningApps: Record<string, boolean>;
  /** Clave: slug de sub-app (ej. ab-kupfer); valor: eliminación en curso. */
  deletingApps: Record<string, boolean>;
  /** Sub-apps ocultas en sidebar tras eliminación simulada (slug). */
  hiddenMisAppSlugs: Record<string, boolean>;
  /** Módulos elegidos en War Room por sub-app (hub-and-spoke). */
  misAppModules: Record<string, string[]>;
  /** Estado de conexión bancaria por appContext. */
  connectedBanks: Record<string, boolean>;
  setOverlayWidgets: (
    widgets: string[] | null,
    finance?: OverlayFinancePayload | null,
    warRoomConfig?: WarRoomConfig | null,
    appContext?: string | null,
  ) => void;
  setProvisioningApp: (appName: string, isProvisioning: boolean) => void;
  setDeletingApp: (appId: string, isDeleting: boolean) => void;
  setMisAppHidden: (slug: string, hidden: boolean) => void;
  setMisAppModules: (slug: string, moduleIds: string[]) => void;
  setBankConnected: (appContext: string, isConnected: boolean) => void;
}

/** Normaliza nombres para cruzar sidebar (ej. "App AB Kupfer") con businessName del War Room. */
export function normalizeProvisioningDisplayKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^app\s+/i, '')
    .replace(/[^a-z0-9]+/g, '');
}

/** Slug bajo `/dashboard/mis-apps/[slug]` o null si no aplica. */
export function misAppSlugFromHref(href: string): string | null {
  const path = href.startsWith('/') ? href : `/${href}`;
  const parts = path.split('/').filter(Boolean);
  const i = parts.indexOf('mis-apps');
  if (i === -1 || i >= parts.length - 1) return null;
  return parts[i + 1] ?? null;
}

export function isSidebarLeafProvisioning(
  provisioningApps: Record<string, boolean>,
  sidebarLeafLabel: string,
): boolean {
  const leafKey = normalizeProvisioningDisplayKey(sidebarLeafLabel);
  if (!leafKey) return false;
  return Object.entries(provisioningApps).some(
    ([businessKey, on]) =>
      on === true && normalizeProvisioningDisplayKey(businessKey) === leafKey,
  );
}

const MIS_APP_MODULES_STORAGE_KEY = 'fifer.mis-app-modules.v1';
const CONNECTED_BANKS_STORAGE_KEY = 'fifer.connected-banks.v1';

function loadPersistedMisAppModules(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MIS_APP_MODULES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string[]> = {};
    for (const [slug, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      out[slug] = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    }
    return out;
  } catch {
    return {};
  }
}

function persistMisAppModules(modules: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MIS_APP_MODULES_STORAGE_KEY, JSON.stringify(modules));
  } catch {
    // Best effort persistence only.
  }
}

function loadConnectedBanks(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CONNECTED_BANKS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = v === true;
    }
    return out;
  } catch {
    return {};
  }
}

function persistConnectedBanks(next: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONNECTED_BANKS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best effort persistence only.
  }
}

export const useUIStore = create<UIState>((set) => ({
  activeOverlayWidgets: null,
  overlayFinance: null,
  overlayWarRoomConfig: null,
  overlayAppContext: null,
  provisioningApps: {},
  deletingApps: {},
  hiddenMisAppSlugs: {},
  misAppModules: loadPersistedMisAppModules(),
  connectedBanks: loadConnectedBanks(),
  setOverlayWidgets: (widgets, finance, warRoomConfig, appContext) =>
    set({
      activeOverlayWidgets: widgets,
      overlayFinance: widgets == null ? null : (finance ?? null),
      overlayWarRoomConfig: widgets == null ? null : (warRoomConfig ?? null),
      overlayAppContext: widgets == null ? null : (appContext ?? null),
    }),
  setProvisioningApp: (appName, isProvisioning) =>
    set((state) => ({
      provisioningApps: { ...state.provisioningApps, [appName]: isProvisioning },
    })),
  setDeletingApp: (appId, isDeleting) =>
    set((state) => ({
      deletingApps: { ...state.deletingApps, [appId]: isDeleting },
    })),
  setMisAppHidden: (slug, hidden) =>
    set((state) => ({
      hiddenMisAppSlugs: { ...state.hiddenMisAppSlugs, [slug]: hidden },
    })),
  setMisAppModules: (slug, moduleIds) =>
    set((state) => {
      const next = { ...state.misAppModules, [slug]: moduleIds };
      persistMisAppModules(next);
      return { misAppModules: next };
    }),
  setBankConnected: (appContext, isConnected) =>
    set((state) => {
      const key = appContext.trim() || 'global';
      const next = { ...state.connectedBanks, [key]: isConnected };
      persistConnectedBanks(next);
      return { connectedBanks: next };
    }),
}));
