import type { ModuleConfig } from "@/types/architecture";

/** Placeholder de navegación durante fase de esqueleto schema-driven. */
export const navigation: Array<{ label: string; route: string; module: string }> = [];

export function resolveModuleFromSegments(): ModuleConfig | null {
  return null;
}
