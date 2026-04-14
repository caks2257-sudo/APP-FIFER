import type { CashFlowReport, FintocAccount } from '@/components/dashboard/widgets/contracts';

/** Mocks de negocio: pisos de madera (ABKUPFER). */
export const ABKUPFER_MOCK_DATA = {
  ingresos: [
    { label: 'Venta Piso Roble Americano', amount: 1_450_000 },
    { label: 'Instalación Revestimiento', amount: 980_000 },
  ],
  egresos: [
    { label: 'Importación Barnices', amount: 520_000 },
    { label: 'Sueldos Cuadrilla Instalación', amount: 610_000 },
  ],
} as const;

export function isAbkupferWidgetContext(pathname: string): boolean {
  return pathname.includes('/ab-kupfer');
}

const ingresosTotal = ABKUPFER_MOCK_DATA.ingresos.reduce((s, i) => s + i.amount, 0);
const egresosTotal = ABKUPFER_MOCK_DATA.egresos.reduce((s, i) => s + i.amount, 0);

export const ABKUPFER_MOCK_ACCOUNT: FintocAccount = {
  id: 'acc_abkupfer_demo',
  name: 'ABKUPFER SpA — Cuenta corriente operaciones',
  number: '00008821',
  currency: 'CLP',
  officialName: 'ABKUPFER Pisos de Madera',
  institution: {
    id: 'bch_cl',
    name: 'Banco de Chile',
    iconInitial: 'B',
  },
  balance: {
    current: 10_200_000,
    available: 9_400_000,
  },
  lastSyncAt: 'Hace 2 min',
  syncStatus: 'SYNCED',
};

export const ABKUPFER_CASHFLOW_REPORT: CashFlowReport = {
  periodLabel: 'Marzo 2026 · ABKUPFER (pisos de madera)',
  currency: 'CLP',
  ingresosDte: {
    projectedAmount: ingresosTotal,
    documentCount: ABKUPFER_MOCK_DATA.ingresos.length,
  },
  egresosFacturas: {
    payableAmount: egresosTotal,
    documentCount: ABKUPFER_MOCK_DATA.egresos.length,
  },
};
