import type { ResolvedKey } from '../bridge-proxy';
import { mockBillingLatestInvoice } from '../mocks';
import { mockEmitDte } from '../mocks/billing-dte';

export type BillingCustomerData = {
  rut: string;
  businessName: string;
  email: string;
};

export type BillingLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  /** Por defecto integradores Chile: 19% IVA */
  taxRate?: number;
};

export type BillingTotals = {
  net: number;
  tax: number;
  total: number;
};

/**
 * Payload compatible con integradores tipo OpenFactura (referencia lógica, no esquema oficial completo).
 */
export type EmitInvoiceInput = {
  /** Obligatorio — ancla de idempotencia y trazabilidad FIFER */
  transactionId: string;
  customerData: BillingCustomerData;
  items: BillingLineItem[];
  totals: BillingTotals;
  /** Para URLs mock (PDF simulado) */
  publicOrigin: string;
};

export type EmitInvoiceResult = {
  mode: 'MOCK' | 'PROD';
  folio: number | null;
  url_pdf: string | null;
  token_sii: string | null;
  /** JSON enviado o simulado (auditoría) */
  requestPayload: Record<string, unknown>;
};

export type BillingAdapterResult = {
  mode: 'MOCK' | 'PROD';
  data: ReturnType<typeof mockBillingLatestInvoice> | { note: string };
};

export class BillingAdapter {
  constructor(private readonly resolved: ResolvedKey) {}

  /**
   * Emisión DTE / factura electrónica (mock o stub PROD).
   * No invocar sin `transactionId` válido (no vacío).
   */
  async emitInvoice(input: EmitInvoiceInput): Promise<EmitInvoiceResult> {
    const tid = input.transactionId?.trim();
    if (!tid) {
      throw new Error('[BillingAdapter] emitInvoice requiere transactionId válido');
    }

    const requestPayload = {
      integrator: 'openfactura-compatible',
      transactionId: tid,
      documentType: '33',
      customer: input.customerData,
      items: input.items,
      totals: input.totals,
    } as Record<string, unknown>;

    if (this.resolved.mode === 'MOCK' || !this.resolved.secret) {
      const mock = mockEmitDte({
        transactionId: tid,
        publicOrigin: input.publicOrigin,
      });
      return {
        mode: 'MOCK',
        folio: mock.folio,
        url_pdf: mock.url_pdf,
        token_sii: mock.token_sii,
        requestPayload: {
          ...requestPayload,
          mockDte: mock,
        },
      };
    }

    return {
      mode: 'PROD',
      folio: null,
      url_pdf: null,
      token_sii: null,
      requestPayload: {
        ...requestPayload,
        note:
          'PROD: integración OpenFactura/SII pendiente — no se emitió DTE real.',
      },
    };
  }

  async getLatestInvoice(): Promise<BillingAdapterResult> {
    if (this.resolved.mode === 'MOCK' || !this.resolved.secret) {
      return { mode: 'MOCK', data: mockBillingLatestInvoice() };
    }
    return {
      mode: 'PROD',
      data: {
        note:
          'PROD: integración Stripe Billing pendiente de llamada desde servidor.',
      },
    };
  }
}
