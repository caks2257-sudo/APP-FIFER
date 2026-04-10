import { Transaction, CashflowSummary, FinanceContext } from './types';

export class FinanceEngine {
  private context: FinanceContext;

  constructor(context: FinanceContext) {
    this.context = context;
  }

  /**
   * Estandariza un monto a CLP basado en su moneda original
   */
  convertToCLP(amount: number, currency: 'CLP' | 'UF' | 'USD'): number {
    if (currency === 'CLP') return amount;
    if (currency === 'UF') return amount * this.context.currentUFValue;
    // USD mockeado para simplificar, en un caso real vendría del context
    if (currency === 'USD') return amount * 950;
    return amount;
  }

  /**
   * Procesa un array de transacciones y devuelve un resumen de flujo de caja
   */
  calculateCashflow(transactions: Transaction[]): CashflowSummary {
    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      const amountCLP = this.convertToCLP(t.amount, t.currency);
      if (t.type === 'INCOME') {
        income += amountCLP;
      } else {
        expense += amountCLP;
      }
    }

    const net = income - expense;
    const roi = expense > 0 ? (net / expense) * 100 : undefined;

    return {
      totalIncomeCLP: income,
      totalExpenseCLP: expense,
      netCashflowCLP: net,
      roiPercentage: roi !== undefined ? parseFloat(roi.toFixed(2)) : undefined,
    };
  }
}
