import {
  ModuleConfigRegistrySchema,
  ModuleConfigSchema,
  type ModuleConfigRegistry,
} from "@/schema/registry.schema";

const ContentCore = ModuleConfigSchema.parse({
  id: "content",
  biomePrimary: "#1E3A5F",
  biomeAccent: "#2563EB",
});

/** Bioma azul editorial — primary `#1E3A5F` (`resolveModuleBiome("content")`). */
export const ContentModuleConfig: ModuleConfigRegistry = ModuleConfigRegistrySchema.parse({
  id: ContentCore.id,
  nombre: "Content",
  icono: "file-text",
  biome: {
    primary: ContentCore.biomePrimary,
    accent: ContentCore.biomeAccent,
    surface: "#0c1220",
    onPrimary: "#F8FAFC",
  },
  themeOverrides: {
    primary: ContentCore.biomePrimary,
    accent: ContentCore.biomeAccent,
    surface: "#0c1220",
    onPrimary: "#F8FAFC",
  },
  routes: [
    {
      path: "/generar",
      slots: {
        "slot-main": ["content-ingestion-form", "content-google-shopping"],
        "slot-gallery": ["asset-gallery"],
      },
      rolesRequired: [],
    },
  ],
});

