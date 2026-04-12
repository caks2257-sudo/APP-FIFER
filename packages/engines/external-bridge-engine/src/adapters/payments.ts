import type { ResolvedKey } from '../bridge-proxy';
import { signPaymentWebhookToken } from '../payment-webhook';
import { mockPaymentsCreateIntent } from '../mocks';

export type CreateCheckoutLinkInput = {
  amountClp: number;
  description: string;
  transactionId: string;
  /** Origen público (ej. https://app.example.com) sin barra final */
  publicOrigin: string;
};

export type CreateCheckoutLinkResult = {
  mode: 'MOCK' | 'PROD';
  url: string;
  checkoutId: string;
};

export type PaymentsAdapterResult = {
  mode: 'MOCK' | 'PROD';
  data: ReturnType<typeof mockPaymentsCreateIntent> | { note: string };
};

export class PaymentsAdapter {
  constructor(private readonly resolved: ResolvedKey) {}

  /**
   * Genera URL de checkout (mock con página local de confirmación o stub PROD Flow).
   */
  async createCheckoutLink(
    input: CreateCheckoutLinkInput,
  ): Promise<CreateCheckoutLinkResult> {
    const checkoutId = `fifer_chk_${input.transactionId.slice(0, 8)}_${Date.now()}`;
    const origin = input.publicOrigin.replace(/\/$/, '');

    if (this.resolved.mode === 'MOCK' || !this.resolved.secret) {
      const sig = signPaymentWebhookToken(input.transactionId);
      const q = new URLSearchParams({
        transactionId: input.transactionId,
        sig,
      });
      const url = `${origin}/payment-mock?${q.toString()}`;
      return { mode: 'MOCK', url, checkoutId };
    }

    const flowParams = new URLSearchParams({
      amount: String(Math.round(input.amountClp)),
      description: input.description.slice(0, 200),
      commerceOrder: input.transactionId,
    });
    const url = `https://www.flow.cl/api/payment?${flowParams.toString()}`;
    return { mode: 'PROD', url, checkoutId };
  }

  async getCheckoutSnapshot(): Promise<PaymentsAdapterResult> {
    if (this.resolved.mode === 'MOCK' || !this.resolved.secret) {
      return { mode: 'MOCK', data: mockPaymentsCreateIntent() };
    }
    return {
      mode: 'PROD',
      data: {
        note:
          'PROD: integración Flow pendiente de llamada HTTP firmada desde servidor.',
      },
    };
  }
}
