"use client";

import type { BoxRegistryId } from "@/types/box.types";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Columnas ocupadas en la rejilla (12 columnas) por breakpoint.
 * Valores más altos = más ancho en ese viewport.
 */
export type BoxColSpanByBreakpoint = {
  /** Mobile-first base (viewport estrecho). */
  default: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
};

export type BoxRegistryEntry = {
  id: BoxRegistryId;
  title: string;
  component: LazyExoticComponent<ComponentType<unknown>>;
  colSpan: BoxColSpanByBreakpoint;
};

const StatsOverviewLazy = lazy(() => import("@/boxes/stats-overview"));
const ActiveProjectsLazy = lazy(() => import("@/boxes/active-projects"));

/**
 * Registro simulado de cajas con importación diferida (JIT / code-splitting).
 */
export const BOX_REGISTRY: Record<BoxRegistryId, BoxRegistryEntry> = {
  "stats-overview": {
    id: "stats-overview",
    title: "Resumen de métricas",
    component: StatsOverviewLazy,
    colSpan: {
      default: 12,
      sm: 12,
      md: 8,
      lg: 6,
      xl: 5,
    },
  },
  "active-projects": {
    id: "active-projects",
    title: "Proyectos activos",
    component: ActiveProjectsLazy,
    colSpan: {
      default: 12,
      sm: 12,
      md: 12,
      lg: 6,
      xl: 7,
    },
  },
};
