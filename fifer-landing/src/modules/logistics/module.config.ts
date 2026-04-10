import {
  ModuleConfigRegistrySchema,
  ModuleConfigSchema,
  type ModuleConfigRegistry,
} from "@/schema/registry.schema";

const LogisticsCore = ModuleConfigSchema.parse({
  id: "logistics",
  biomePrimary: "#1D4ED8",
  biomeAccent: "#64748B",
});

/** Bioma Azul Cobalto + Acero. */
export const LogisticsModuleConfig: ModuleConfigRegistry = ModuleConfigRegistrySchema.parse({
  id: LogisticsCore.id,
  nombre: "Logistics",
  icono: "truck",
  biome: {
    primary: LogisticsCore.biomePrimary,
    accent: LogisticsCore.biomeAccent,
    surface: "#0F172A",
    onPrimary: "#F8FAFC",
  },
  themeOverrides: {
    primary: LogisticsCore.biomePrimary,
    accent: LogisticsCore.biomeAccent,
    surface: "#0F172A",
    onPrimary: "#F8FAFC",
  },
  routes: [
    {
      path: "/",
      slots: {
        "slot-main": ["logistics-status-fleet"],
      },
      rolesRequired: [],
    },
  
    {
      path: "/tracking",
      slots: {
        "slot-stats-grid": ["logistics-delivery-map"],
      },
      rolesRequired: [],
    },
],
});
