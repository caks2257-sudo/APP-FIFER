import type { EmitInvoiceInput } from '@fifer/external-bridge-engine';

/** IVA Chile estándar facturas afectas (referencia producto FIFER). */
export const DEFAULT_IVA_RATE = 0.19;

type TxRow = {
  id: string;
  amount: { toString(): string };
  concept: string;
  currency: string;
};

type CustomerSource = {
  email: string;
  name: string;
  expediente?: {
    rut: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
  } | null;
};

/**
 * Construye payload OpenFactura-compatible desde una `Transaction` FIFER (una línea afecta IVA).
 */
export function mapTransactionToEmitInvoiceInput(
  tx: TxRow,
  customer: CustomerSource,
  publicOrigin: string,
): EmitInvoiceInput {
  const total = Number(tx.amount.toString());
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('[billing] monto inválido para emisión DTE');
  }

  const net = Math.round((total / (1 + DEFAULT_IVA_RATE)) * 100) / 100;
  const tax = Math.round((total - net) * 100) / 100;

  const rut = customer.expediente?.rut ?? '66666666-6';
  const businessName = customer.expediente
    ? `${customer.expediente.nombres} ${customer.expediente.apellidoPaterno} ${customer.expediente.apellidoMaterno}`.trim()
    : customer.name;

  return {
    transactionId: tx.id,
    publicOrigin: publicOrigin.replace(/\/$/, ''),
    customerData: {
      rut,
      businessName: businessName.slice(0, 200),
      email: customer.email,
    },
    items: [
      {
        description: tx.concept.slice(0, 500),
        quantity: 1,
        unitPrice: net,
        taxRate: DEFAULT_IVA_RATE,
      },
    ],
    totals: {
      net,
      tax,
      total,
    },
  };
}
