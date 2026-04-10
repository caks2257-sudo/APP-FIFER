/**
 * Core Registry Fase 4: mocks validados con `StandardBoxDataSchema` (contrato `BoxProps.data`).
 */
import { StandardBoxDataSchema, type StandardBoxData } from "@/schema/registry.schema";
import type { FiferBoxDataNormalized } from "@/utils/adapters";
import { toBoxPropsData } from "@/utils/adapters";

/** Red de afiliados — materiales de construcción / ferretería premium. */
export interface AffiliateMockRaw {
  networks: Array<{
    id: string;
    name: string;
    status: "healthy" | "degraded" | "offline";
    lastSyncMs: number;
    activePublishers: number;
  }>;
  commissionLines: Array<{
    id: string;
    label: string;
    orderRef: string;
    materialFamily: string;
    saleAmountClp: number;
    commissionRatePct: number;
    commissionClp: number;
    state: "pending" | "approved" | "paid";
  }>;
}

const affiliateRaw: AffiliateMockRaw = {
  networks: [
    {
      id: "net-ferreteria-pro",
      name: "Ferretería Pro Partners",
      status: "healthy",
      lastSyncMs: Date.now() - 120_000,
      activePublishers: 84,
    },
    {
      id: "net-materiales-cl",
      name: "Materiales.cl Afiliados",
      status: "degraded",
      lastSyncMs: Date.now() - 900_000,
      activePublishers: 31,
    },
  ],
  commissionLines: [
    {
      id: "cm-001",
      label: "Venta materiales · pedido #MP-8821",
      orderRef: "MP-8821",
      materialFamily: "Drywall + perfiles",
      saleAmountClp: 2_450_000,
      commissionRatePct: 6.5,
      commissionClp: 159_250,
      state: "approved",
    },
    {
      id: "cm-002",
      label: "Venta herramientas eléctricas · pedido #MP-8824",
      orderRef: "MP-8824",
      materialFamily: "Herramientas",
      saleAmountClp: 890_000,
      commissionRatePct: 5.0,
      commissionClp: 44_500,
      state: "pending",
    },
  ],
};

const affiliateNormalized: FiferBoxDataNormalized = {
  source: "affiliates",
  title: "Rendimiento de red · materiales",
  series: [
    { label: "Clicks", value: 12_400 },
    { label: "Conversiones", value: 186 },
    { label: "Comisiones CLP", value: 203_750 },
  ],
  metrics: {
    clicks: 12_400,
    commissions: 203_750,
    conversionRate: 1.5,
    redesActivas: 2,
    redSaludable: "Ferretería Pro Partners",
  },
  raw: affiliateRaw,
};

/** Listo para `data={MOCK_AFFILIATE_FEED_DATA}` */
export const MOCK_AFFILIATE_FEED_DATA: StandardBoxData = StandardBoxDataSchema.parse(
  toBoxPropsData(affiliateNormalized)
);

/** Snapshot KPIs afiliados (misma verdad simulada, vista compacta). */
export const MOCK_AFFILIATE_SNAPSHOT_DATA: StandardBoxData = StandardBoxDataSchema.parse(
  toBoxPropsData({
    source: "affiliates",
    title: "Afiliados — snapshot",
    metrics: {
      clicks: 12_400,
      commissions: 203_750,
      estadoRed: "Degraded en Materiales.cl",
    },
    raw: { ...affiliateRaw, view: "snapshot" },
  })
);
