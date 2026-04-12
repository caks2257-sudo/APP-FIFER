import type { ResolvedKey } from '../bridge-proxy';
import { mockBankTransactions } from '../mocks/bank-transactions';
import { mockBankingAccountLinks } from '../mocks';

export type BankTransaction = {
  externalId: string;
  postedAt: Date;
  amountClp: number;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
};

export type BankingTransactionsResult = {
  mode: 'MOCK' | 'PROD';
  transactions: BankTransaction[];
};

export type BankingAdapterResult = {
  mode: 'MOCK' | 'PROD';
  data: ReturnType<typeof mockBankingAccountLinks> | { note: string };
};

export class BankingAdapter {
  constructor(private readonly resolved: ResolvedKey) {}

  /**
   * Movimientos del banco (mock coherentes o stub PROD).
   */
  async getTransactions(): Promise<BankingTransactionsResult> {
    if (this.resolved.mode === 'MOCK' || !this.resolved.secret) {
      return { mode: 'MOCK', transactions: mockBankTransactions() };
    }
    return {
      mode: 'PROD',
      transactions: [],
    };
  }

  async listLinks(): Promise<BankingAdapterResult> {
    if (this.resolved.mode === 'MOCK' || !this.resolved.secret) {
      return { mode: 'MOCK', data: mockBankingAccountLinks() };
    }
    return {
      mode: 'PROD',
      data: {
        note:
          'PROD: integración Fintoc pendiente de llamada desde servidor.',
      },
    };
  }
}
