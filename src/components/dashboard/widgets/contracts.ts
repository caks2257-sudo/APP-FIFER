export interface FintocAccount {
  id: string;
  name: string;
  number: string;
  currency: 'CLP' | 'USD' | 'EUR';
  officialName?: string;
  institution: {
    id: string;
    name: string;
    iconInitial: string;
  };
  balance: {
    current: number;
    available: number;
  };
  lastSyncAt: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'ERROR';
}

export interface CashFlowReport {
  periodLabel: string;
  currency: 'CLP' | 'USD' | 'EUR';
  ingresosDte: {
    projectedAmount: number;
    documentCount: number;
  };
  egresosFacturas: {
    payableAmount: number;
    documentCount: number;
  };
}
