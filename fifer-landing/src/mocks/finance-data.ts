/**
 * Estandarización: `_xray_PROTOCOL_SHELL.md` §2.1 — `data` = `FiferBoxDataNormalized` + `normalized`
 * vía `toBoxPropsData` (`utils/adapters/`). Sin datos sensibles en componentes v0.
 * **Core Registry Fase 4:** cada export pasa `StandardBoxDataSchema.parse` (contrato Zod = especificación funcional).
 */
import { StandardBoxDataSchema, type StandardBoxData } from "@/schema/registry.schema";
import type { FiferBoxDataNormalized } from "@/utils/adapters";
import { toBoxPropsData } from "@/utils/adapters";

/**
 * Chicureo / inmobiliaria — flujos de caja y proyectos de regularización (UF, estados municipales).
 * Ver también `_xray_INTEGRATIONS.md` (API Municipal / Chicureo).
 */
export const financeMockData = {
  /** UF → CLP (valor del día, demo). Reemplazar por API Banco Central en producción. */
  ufValueClpPerDay: 39_250,
  summary: { totalUF: 1250, pendingUF: 180, activeProjects: 5 },
  projects: [
    {
      id: "ch-001",
      name: "Regularización Casa Valle Norte",
      location: "Chicureo",
      status: "Municipalidad",
      progress: 65,
      fee: "45 UF",
      alerts: ["Falta firma propietario en Formulario 5.1"],
    },
    {
      id: "ch-002",
      name: "Recepción Final Loteo Brisas",
      location: "Chicureo",
      status: "Aprobado",
      progress: 100,
      fee: "120 UF",
      alerts: [] as string[],
    },
    {
      id: "ch-003",
      name: "Casa madera · sector Cerro",
      location: "Chicureo",
      status: "En revisión",
      progress: 40,
      fee: "32 UF",
      alerts: ["Informe de suelo pendiente", "Inspección municipal reprogramada"],
    },
  ],
  cashflowChart: [
    { month: "Ene", income: 120, expenses: 40 },
    { month: "Feb", income: 150, expenses: 45 },
    { month: "Mar", income: 90, expenses: 50 },
  ],
} as const;

const financeNormalized: FiferBoxDataNormalized = {
  source: "finance",
  title: "Chicureo · Proyectos y flujo UF",
  series: financeMockData.cashflowChart.map((m) => ({
    label: m.month,
    value: m.income - m.expenses,
  })),
  metrics: {
    totalUF: financeMockData.summary.totalUF,
    pendingUF: financeMockData.summary.pendingUF,
    activeProjects: financeMockData.summary.activeProjects,
    currency: "UF",
  },
  raw: financeMockData,
};

/** Listo para `BoxLoader` → `data={MOCK_FINANCE_DASHBOARD_DATA}` */
export const MOCK_FINANCE_DASHBOARD_DATA: StandardBoxData = StandardBoxDataSchema.parse(
  toBoxPropsData(financeNormalized)
);

/** Variante snapshot / rejilla de transacciones. */
export const MOCK_FINANCE_SNAPSHOT_DATA: StandardBoxData = StandardBoxDataSchema.parse(
  toBoxPropsData({
    source: "finance",
    title: "Snapshot financiero · Chicureo",
    metrics: {
      totalUF: financeMockData.summary.totalUF,
      pendingUF: financeMockData.summary.pendingUF,
      proyectosActivos: financeMockData.summary.activeProjects,
    },
    raw: { ...financeMockData, view: "snapshot" },
  })
);
