/**
 * Registro maestro de módulos (Core Registry Fase 3) — fuente única de configs validadas con Zod.
 */
import type { ModuleConfigRegistry } from "@/schema/registry.schema";
import { AffiliatesModuleConfig } from "@/modules/affiliates/module.config";
import { ContentModuleConfig } from "@/modules/content/module.config";
import { FinanceModuleConfig } from "@/modules/finance/module.config";
import { LogisticsModuleConfig } from "@/modules/logistics/module.config";

/** Fase 2: arreglo maestro validado de configuraciones de módulo. */
export const MASTER_MODULE_REGISTRY: ReadonlyArray<ModuleConfigRegistry> = Object.freeze([
  FinanceModuleConfig,
  ContentModuleConfig,
  AffiliatesModuleConfig,
  LogisticsModuleConfig,
]);

/** Lookup por id para compatibilidad en runtime. */
export const MASTER_MODULE_REGISTRY_BY_ID: Readonly<Record<string, ModuleConfigRegistry>> = Object.freeze(
  Object.fromEntries(MASTER_MODULE_REGISTRY.map((m) => [m.id, m]))
);

export type MasterModuleRegistryKey = "finance" | "content" | "affiliates" | "logistics";

export function getMasterModuleConfig(id: MasterModuleRegistryKey): ModuleConfigRegistry {
  return MASTER_MODULE_REGISTRY_BY_ID[id];
}
