import {
  ModuleConfigRegistrySchema,
  ModuleConfigSchema,
  type ModuleConfigRegistry,
} from "@/schema/registry.schema";

const ScrapingCore = ModuleConfigSchema.parse({
  id: "scraping",
  biomePrimary: "#22D3EE",
  biomeAccent: "#6366F1",
});

/** Bioma Cian/Indigo para scraping intelligence. */
export const ScrapingModuleConfig: ModuleConfigRegistry = ModuleConfigRegistrySchema.parse({
  id: ScrapingCore.id,
  nombre: "Scraping",
  icono: "scan-search",
  biome: {
    primary: ScrapingCore.biomePrimary,
    accent: ScrapingCore.biomeAccent,
    surface: "#0B1120",
    onPrimary: "#F8FAFC",
  },
  themeOverrides: {
    primary: ScrapingCore.biomePrimary,
    accent: ScrapingCore.biomeAccent,
    surface: "#0B1120",
    onPrimary: "#F8FAFC",
  },
  routes: [
    {
      path: "/",
      slots: {
        "slot-main": ["resizable-split-layout-box"],
      },
      rolesRequired: [],
    },
  ],
});
