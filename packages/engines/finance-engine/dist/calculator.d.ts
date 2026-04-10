import { Transaction, CashflowSummary, FinanceContext } from './types';
export declare class FinanceEngine {
    private context;
    constructor(context: FinanceContext);
    /**
     * Estandariza un monto a CLP basado en su moneda original
     */
    convertToCLP(amount: number, currency: 'CLP' | 'UF' | 'USD'): number;
    /**
     * Procesa un array de transacciones y devuelve un resumen de flujo de caja
     */
    calculateCashflow(transactions: Transaction[]): CashflowSummary;
}
