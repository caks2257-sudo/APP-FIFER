import {
  ModuleConfigRegistrySchema,
  ModuleConfigSchema,
  type ModuleConfigRegistry,
} from "@/schema/registry.schema";

const FinanceCore = ModuleConfigSchema.parse({
  id: "finance",
  biomePrimary: "#059669",
  biomeAccent: "#D97706",
});

/** Bioma Esmeralda ? primary `#059669` (`resolveModuleBiome("finance")`). */
export const FinanceModuleConfig: ModuleConfigRegistry = ModuleConfigRegistrySchema.parse({
  id: FinanceCore.id,
  nombre: "Finance",
  icono: "wallet",
  biome: {
    primary: FinanceCore.biomePrimary,
    accent: FinanceCore.biomeAccent,
    surface: "#18181B",
    onPrimary: "#0A0F1E",
  },
  themeOverrides: {
    primary: FinanceCore.biomePrimary,
    accent: FinanceCore.biomeAccent,
    surface: "#18181B",
    onPrimary: "#0A0F1E",
  },
  routes: [
    {
      path: "/auditoria",
      slots: {
        "slot-main": ["finance-cashflow-chart", "finance-transactions-grid"],
      },
      rolesRequired: [],
    },
  ],
});

