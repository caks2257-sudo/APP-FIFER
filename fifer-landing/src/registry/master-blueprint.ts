import { z } from "zod";

const HexColorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Debe ser color hexadecimal (#RGB o #RRGGBB)");

export const GridSpanSchema = z.number().min(1).max(12);

export const UiTokensSchema = z
  .object({
    deepNavy: HexColorSchema,
    electricYellow: HexColorSchema,
    slateGray: HexColorSchema,
    financeEmerald: HexColorSchema,
    borderRadius: z.string().min(1),
    gridCols: z.number(),
    layout: z
      .object({
        sidebarExpandedPx: z.number().int().positive(),
        sidebarCollapsedPx: z.number().int().positive(),
        dashboardGap: z.string().min(1),
        responsiveCols: z
          .object({
            mobile: z.number().int().min(1),
            tablet: z.number().int().min(1),
            desktop: z.number().int().min(1),
          })
          .strict(),
      })
      .strict(),
    zIndex: z
      .object({
        backdrop: z.number().int().nonnegative(),
        modal: z.number().int().nonnegative(),
        popover: z.number().int().nonnegative(),
      })
      .strict(),
    surfaceStyles: z
      .object({
        glassmorphism: z.string().min(1),
        panelBorder: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export const ModuleSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    biomePrimary: HexColorSchema,
    biomeAccent: HexColorSchema,
    slots: z.array(z.string().min(1)),
  })
  .strict();

export const BoxManifestSchema = z
  .object({
    boxId: z.string().min(1),
    sourceModule: z.string().min(1),
    targetSlot: z.string().min(1),
    layout: z
      .object({
        minWidth: GridSpanSchema,
        minHeight: GridSpanSchema,
      })
      .strict(),
    capabilities: z
      .object({
        isRefining: z.boolean(),
        requiresPro: z.boolean(),
        hasAIChat: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const BoxProtocolSchema = z
  .object({
    interface: z.array(z.string().min(1)),
    hydration: z.string().min(1),
    states: z
      .object({
        isRefining: z.string().min(1),
        isLoading: z.string().min(1),
        isLocked: z.string().min(1),
        hasError: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export const MasterBlueprintSchema = z
  .object({
    uiTokens: UiTokensSchema,
    boxProtocol: BoxProtocolSchema,
    modules: z.array(ModuleSchema),
    boxCatalog: z.array(BoxManifestSchema),
  })
  .strict();

export type GridSpan = z.infer<typeof GridSpanSchema>;
export type UiTokens = z.infer<typeof UiTokensSchema>;
export type ModuleBlueprint = z.infer<typeof ModuleSchema>;
export type BoxManifest = z.infer<typeof BoxManifestSchema>;
export type BoxProtocol = z.infer<typeof BoxProtocolSchema>;
export type MasterBlueprint = z.infer<typeof MasterBlueprintSchema>;

const RAW_BLUEPRINT: MasterBlueprint = {
  uiTokens: {
    deepNavy: "#0A0F1E",
    electricYellow: "#EAB308",
    slateGray: "#94A3B8",
    financeEmerald: "#059669",
    borderRadius: "0.75rem",
    gridCols: 12,
    layout: {
      sidebarExpandedPx: 280,
      sidebarCollapsedPx: 80,
      dashboardGap: "gap-4",
      responsiveCols: {
        mobile: 1,
        tablet: 6,
        desktop: 12,
      },
    },
    zIndex: {
      backdrop: 40,
      modal: 50,
      popover: 60,
    },
    surfaceStyles: {
      glassmorphism: "bg-opacity-10 backdrop-blur-md",
      panelBorder: "border-white/5",
    },
  },
  boxProtocol: {
    interface: ["data", "config", "isRefining"],
    hydration: "JIT desde box-catalog.ts",
    states: {
      isRefining: "La IA está puliendo el prompt. Mostrar animación de Chispa (Sparkle).",
      isLoading: "Mostrar skeleton screen con color del bioma del módulo.",
      isLocked: "Mostrar JITUpsellBanner.",
      hasError: "Mostrar DiscoveryBox (Modo Sanación).",
    },
  },
  modules: [
    {
      id: "finance",
      name: "Finance",
      biomePrimary: "#059669",
      biomeAccent: "#D97706",
      slots: ["slot-main", "slot-stats-grid"],
    },
    {
      id: "content",
      name: "Content",
      biomePrimary: "#1E3A5F",
      biomeAccent: "#2563EB",
      slots: ["slot-main", "slot-gallery"],
    },
    {
      id: "affiliates",
      name: "Affiliates",
      biomePrimary: "#EAB308",
      biomeAccent: "#2563EB",
      slots: ["slot-hero", "slot-stats-grid", "slot-main-content"],
    },
  ],
  boxCatalog: [
    {
      boxId: "finance-cashflow-chart",
      sourceModule: "finance",
      targetSlot: "slot-main",
      layout: { minWidth: 6, minHeight: 2 },
      capabilities: { isRefining: true, requiresPro: true, hasAIChat: true },
    },
    {
      boxId: "content-ingestion-form",
      sourceModule: "content",
      targetSlot: "slot-main",
      layout: { minWidth: 6, minHeight: 3 },
      capabilities: { isRefining: true, requiresPro: false, hasAIChat: true },
    },
    {
      boxId: "affiliate-hero-summary",
      sourceModule: "affiliates",
      targetSlot: "slot-hero",
      layout: { minWidth: 6, minHeight: 2 },
      capabilities: { isRefining: false, requiresPro: false, hasAIChat: true },
    },
  ],
};

export const FIFER_BLUEPRINT = MasterBlueprintSchema.parse(RAW_BLUEPRINT);
