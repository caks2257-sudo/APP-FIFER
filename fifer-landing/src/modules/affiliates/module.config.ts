import {
  ModuleConfigRegistrySchema,
  ModuleConfigSchema,
  type ModuleConfigRegistry,
} from "@/schema/registry.schema";

const AffiliatesCore = ModuleConfigSchema.parse({
  id: "affiliates",
  biomePrimary: "#EAB308",
  biomeAccent: "#2563EB",
});

/** Bioma Yellow Electric — primary `#EAB308` (`resolveModuleBiome("affiliates")`). */
export const AffiliatesModuleConfig: ModuleConfigRegistry = ModuleConfigRegistrySchema.parse({
  id: AffiliatesCore.id,
  nombre: "Afiliados",
  icono: "link-2",
  biome: {
    primary: AffiliatesCore.biomePrimary,
    accent: AffiliatesCore.biomeAccent,
    surface: "#18181B",
    onPrimary: "#0A0F1E",
  },
  themeOverrides: {
    primary: AffiliatesCore.biomePrimary,
    accent: AffiliatesCore.biomeAccent,
    surface: "#18181B",
    onPrimary: "#0A0F1E",
  },
  routes: [
    {
      path: "/",
      slots: {
        "slot-hero": ["affiliate-hero-summary"],
        "slot-stats-grid": ["affiliate-kpi-grid"],
        "slot-main-content": ["affiliate-offers-table"],
      },
      rolesRequired: [],
    },
    {
      path: "/comisiones",
      slots: {
        "slot-stats-grid": ["affiliate-kpi-grid"],
        "slot-main-content": ["affiliate-offers-table"],
      },
      rolesRequired: [],
    },
  ],
});

