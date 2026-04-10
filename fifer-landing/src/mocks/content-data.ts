/**
 * Estandarización: `_xray_PROTOCOL_SHELL.md` §2.1 — `source: "generic"` + `raw` tipado;
 * listo para SDUI opcional (`config` en `BoxProps`).
 * **Core Registry Fase 4:** validación con `StandardBoxDataSchema` al exportar.
 */
import { StandardBoxDataSchema, type StandardBoxData } from "@/schema/registry.schema";
import type { FiferBoxDataNormalized } from "@/utils/adapters";
import { toBoxPropsData } from "@/utils/adapters";

/**
 * ABKupfer.cl — productos (pisos roble, cladding) y campañas (mini-series IA, Google Shopping).
 * Shopify ABKupfer / Meta / Google: estados en `_xray_INTEGRATIONS.md`.
 */
export const contentMockData = {
  brand: "ABKupfer.cl",
  inventory: [
    {
      name: "Piso Ingeniería Roble Europeo",
      stock: "140 m2",
      price: "$42.990/m2",
      trend: "Alta",
    },
    {
      name: "Cladding Pino Termotratado",
      stock: "0 m2",
      price: "$28.500/m2",
      trend: "Crítica",
    },
  ],
  campaigns: [
    {
      title: "Mini-Serie: Terrazas de Invierno",
      platform: "Instagram/TikTok",
      status: "Generando con IA",
      assets: ["Video_1_Hook.mp4", "Video_2_DeepDive.mp4"],
      reachEstimate: "15k - 25k",
    },
    {
      title: "Google Shopping: Pisos de Madera",
      platform: "Google Ads",
      status: "Pausada (Falta API Key)",
      assets: [] as string[],
      reachEstimate: "0",
    },
  ],
} as const;

const contentNormalized: FiferBoxDataNormalized = {
  source: "generic",
  title: "Pipeline editorial · ABKupfer.cl",
  series: [
    { label: "SKUs activos", value: contentMockData.inventory.length },
    { label: "Campañas", value: contentMockData.campaigns.length },
  ],
  metrics: {
    marca: contentMockData.brand,
    alertaStock: contentMockData.inventory.some((i) => i.trend === "Crítica") ? "Crítica" : "OK",
    campañaIA: "Mini-Serie: Terrazas de Invierno",
    googleShopping: "Pausada (API Key)",
  },
  raw: contentMockData,
};

/** Listo para `data={MOCK_CONTENT_PIPELINE_DATA}` */
export const MOCK_CONTENT_PIPELINE_DATA: StandardBoxData = StandardBoxDataSchema.parse(
  toBoxPropsData(contentNormalized)
);

/** Variante solo catálogo de productos (galería / slots secundarios). */
export const MOCK_CONTENT_PRODUCTS_DATA: StandardBoxData = StandardBoxDataSchema.parse(
  toBoxPropsData({
    source: "generic",
    title: "Inventario destacado",
    metrics: { items: contentMockData.inventory.length },
    raw: { inventory: contentMockData.inventory },
  })
);
