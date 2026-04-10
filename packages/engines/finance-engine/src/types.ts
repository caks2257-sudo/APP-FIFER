export interface Transaction {
  id: string;
  amount: number;
  currency: 'CLP' | 'UF' | 'USD';
  type: 'INCOME' | 'EXPENSE';
  date: Date;
  category?: string;
}

export interface CashflowSummary {
  totalIncomeCLP: number;
  totalExpenseCLP: number;
  netCashflowCLP: number;
  roiPercentage?: number;
}

export interface FinanceContext {
  currentUFValue: number; // Valor de la UF del día inyectado por el Data Engine o API
}
