import type { BridgeIntegrationId } from '../keys';

export type MockPaymentsIntent = {
  id: string;
  amountClp: number;
  currency: 'CLP';
  status: 'ready' | 'authorized';
  provider: 'flow-mock';
};

export type MockBillingInvoice = {
  id: string;
  period: string;
  amountClp: number;
  status: 'paid' | 'open';
  provider: 'stripe-mock';
};

export type MockBankingLink = {
  id: string;
  institution: string;
  mask: string;
  balanceClp: number;
  provider: 'fintoc-mock';
};

export function mockPaymentsCreateIntent(): MockPaymentsIntent {
  return {
    id: 'mock_flow_intent_001',
    amountClp: 15990,
    currency: 'CLP',
    status: 'ready',
    provider: 'flow-mock',
  };
}

export function mockBillingLatestInvoice(): MockBillingInvoice {
  return {
    id: 'mock_in_7xK2mQ',
    period: '2026-04',
    amountClp: 49900,
    status: 'paid',
    provider: 'stripe-mock',
  };
}

export function mockBankingAccountLinks(): MockBankingLink[] {
  return [
    {
      id: 'mock_link_banco_01',
      institution: 'Banco Mock',
      mask: '****1234',
      balanceClp: 1_250_000,
      provider: 'fintoc-mock',
    },
  ];
}

export function mockPayloadForIntegration(id: BridgeIntegrationId): unknown {
  switch (id) {
    case 'payments':
      return mockPaymentsCreateIntent();
    case 'billing':
      return mockBillingLatestInvoice();
    case 'banking':
      return mockBankingAccountLinks();
    default:
      return {};
  }
}
