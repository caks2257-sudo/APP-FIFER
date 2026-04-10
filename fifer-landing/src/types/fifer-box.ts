/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BoxUIConfig } from "@/types/ui-schema";

/** Layout contract from backend / manifests — aligns with the layout store’s base dimensions. */
export interface IFiferBoxLayoutManifest {
  minWidth: number;
  minHeight: number;
  isResizable?: boolean;
}

/** Same value as `IFiferBoxManifest.boxId` and keys of `userLayout` in `useLayoutStore`. */
export type FiferBoxId = string;

export interface IFiferBoxManifest {
  boxId: FiferBoxId;
  sourceModule: string;
  targetSlot: string;
  layout: IFiferBoxLayoutManifest;
  propsSchema?: {
    type: "object";
    required: string[];
    properties: Record<string, { type: string }>;
  };
  dataDependencies?: string[];
  fallbackStrategy?: "ghost" | "discovery" | "retry";
  themeOverrides?: Record<string, string>;
  permissions?: string[];
}

/**
 * Memoria de layout por caja (Zustand `userLayout`).
 * `baseColSpan` / `baseRowSpan` se inicializan desde `IFiferBoxManifest.layout` (`minWidth` / `minHeight`)
 * vía `baseDimensionsFromManifest`; el usuario puede desviarse con `updateLayout`.
 */
export interface UserBoxLayoutEntry {
  x: number;
  y: number;
  colSpan: number;
  rowSpan: number;
  isExpanded: boolean;
  baseColSpan: number;
  baseRowSpan: number;
  slotName: string;
  /** Vista “trasera” / IA para animación flip (toggle con `toggleAIView`). */
  showAIFace?: boolean;
}

export interface BoxProps {
  data?: any;
  config?: BoxUIConfig | any;
  isLoading?: boolean;
  error?: Error | null;
  isLocked?: boolean;
  /**
   * Dual-Stage Pipeline: Etapa 1 (refinamiento). Cuando es true, la micro-UI (v0) muestra
   * “Pulido de Prompt” antes de revelar el resultado final (`_xray_PROTOCOL_SHELL.md`).
   */
  isRefining?: boolean;
  /** Identificador del Box (registry / manifiesto) — prompts IA, telemetría. */
  boxId?: string;
  /** Bridge universal de motores: dispara ejecución + expone estados Dual-Stage. */
  engine?: {
    run: <TPayload = unknown, TResult = unknown>(engineId: string, payload: TPayload) => Promise<TResult>;
    data: unknown;
    isLoading: boolean;
    isRefining: boolean;
    error: Error | null;
    lastEngineManifest?: Partial<IFiferBoxManifest> | null;
    requiresProMotor?: boolean;
  };
}

/** Maps manifest layout to grid units used by `BoxLayoutState` (1–12 cols, 1–6 rows). */
export function baseDimensionsFromManifest(m?: IFiferBoxManifest): { baseWidth: number; baseHeight: number } {
  const mw = m?.layout.minWidth ?? 4;
  const mh = m?.layout.minHeight ?? 1;
  return {
    baseWidth: Math.min(12, Math.max(1, Math.round(mw))),
    baseHeight: Math.min(6, Math.max(1, Math.round(mh))),
  };
}
