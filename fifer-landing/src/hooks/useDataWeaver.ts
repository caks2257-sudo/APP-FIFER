"use client";

import { useMemo } from "react";

import {
  weaveModuleData,
  wovenToBoxPropsData,
  type WeaverCriterion,
  type WeaverModuleSlice,
  type WovenBoxData,
} from "../../../src/core/dataWeaver";

export type { WeaverCriterion, WeaverModuleSlice, WovenBoxData };

/**
 * Fusiona arrays de módulos bajo un criterio de cruce y devuelve `data` compatible con
 * `BoxProps` / capa `normalized` (`_xray_PROTOCOL_SHELL.md`).
 */
export function useDataWeaver(slices: WeaverModuleSlice[], criterion: WeaverCriterion): Record<string, unknown> {
  return useMemo(() => {
    const woven = weaveModuleData(slices, criterion);
    return wovenToBoxPropsData(woven);
  }, [slices, criterion]);
}
