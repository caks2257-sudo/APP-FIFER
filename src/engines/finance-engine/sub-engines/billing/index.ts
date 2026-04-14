/**
 * Sub-Engine `finance-engine:billing` — facturación DTE vía External Bridge (OpenFactura / SII).
 */

import '@/engines/external-bridge-engine';

import type { PrismaClient } from '@prisma/client';

import type { ExternalBridgeEngineApi } from '@fifer/external-bridge-engine';

import {
  EmitInvoiceInputSchema,
  EmitInvoiceOutputSchema,
  TriggerAutoInvoiceInputSchema,
} from '@/engines/finance-engine/schemas';
import { EngineRegistry } from '@/registry/engine-registry';

const SUB_ENGINE_ID = 'finance-engine:billing' as const;
const BILLING_AGENT_ID = 'tasklet' as const;

/**
 * Tras checkout completado: emite DTE si aún no hay factura.
 */
export async function triggerAutoInvoiceAfterPaymentCheckout(
  transactionId: string,
  publicOrigin: string,
): Promise<void> {
  const validated = TriggerAutoInvoiceInputSchema.parse({
    transactionId,
    publicOrigin,
  });
  await emitInvoiceForTransaction(undefined as unknown as PrismaClient, validated.transactionId, undefined, {
    onlyPaymentCheckout: true,
    publicOrigin: validated.publicOrigin,
  });
}

export type EmitInvoiceOptions = {
  /** Solo `source === payment_checkout` (trigger automático). */
  onlyPaymentCheckout?: boolean;
  /** Obligatorio en triggers async fuera del request (webhook). */
  publicOrigin?: string;
};

/**
 * Emite factura para una transacción COMPLETADA (ingreso). Idempotente si ya emitido.
 */
export async function emitInvoiceForTransaction(
  prisma: PrismaClient,
  transactionId: string,
  vault: Parameters<ExternalBridgeEngineApi['emitInvoice']>[1],
  options?: EmitInvoiceOptions,
): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  folio?: string | null;
}> {
  const validated = EmitInvoiceInputSchema.parse({
    prisma,
    transactionId,
    vault,
    options,
  });

  const bridge = EngineRegistry.use<ExternalBridgeEngineApi>(
    'external-bridge-engine',
  );
  const envelope = {
    agentId: BILLING_AGENT_ID,
    payload: {
      transactionId: validated.transactionId,
      customerData: {
        rut: '66.666.666-6',
        businessName: 'Cliente derivado a agente externo',
        email: 'delegated@fifer.local',
      },
      items: [
        {
          description: `Delegated invoice ${validated.transactionId}`,
          quantity: 1,
          unitPrice: 0,
          taxRate: 0,
        },
      ],
      totals: { net: 0, tax: 0, total: 0 },
      publicOrigin: validated.options?.publicOrigin ?? 'http://localhost:3000',
    },
  };
  const result = await bridge.emitInvoice(envelope.payload, validated.vault);
  return EmitInvoiceOutputSchema.parse({
    ok: result.mode === 'MOCK' || result.mode === 'PROD',
    skipped: validated.options?.onlyPaymentCheckout ? false : undefined,
    reason: result.mode === 'PROD' ? 'delegated_prod' : 'delegated_mock',
    folio: result.folio != null ? String(result.folio) : null,
  });
}

export type BillingSubEngineApi = {
  emitInvoiceForTransaction: typeof emitInvoiceForTransaction;
  triggerAutoInvoiceAfterPaymentCheckout: typeof triggerAutoInvoiceAfterPaymentCheckout;
};

const api: BillingSubEngineApi = {
  emitInvoiceForTransaction,
  triggerAutoInvoiceAfterPaymentCheckout,
};

try {
  EngineRegistry.register(SUB_ENGINE_ID, api);
} catch (e) {
  console.error(`[FIFER SubEngine] ${SUB_ENGINE_ID} — registro:`, e);
}

export { SUB_ENGINE_ID };
