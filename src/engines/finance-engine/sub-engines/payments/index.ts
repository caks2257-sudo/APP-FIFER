/**
 * Sub-Engine `finance-engine:payments` — checkout externo vía External Bridge.
 */

import '@/engines/external-bridge-engine';

import { Decimal } from '@prisma/client/runtime/library';
import type { PrismaClient } from '@prisma/client';

import type {
  CreateCheckoutLinkResult,
  ExternalBridgeEngineApi,
} from '@fifer/external-bridge-engine';

import { EngineRegistry } from '@/registry/engine-registry';

const SUB_ENGINE_ID = 'finance-engine:payments' as const;

export type CreatePaymentCheckoutParams = {
  prisma: PrismaClient;
  accountId: string;
  amountClp: number;
  description: string;
  publicOrigin: string;
  vault: Parameters<ExternalBridgeEngineApi['createCheckoutLink']>[1];
};

export type CreatePaymentCheckoutResult = CreateCheckoutLinkResult & {
  transactionId: string;
};

/**
 * Crea `Transaction` PENDIENTE (INGRESO) y genera link de pago vía Bridge.
 */
export async function createPaymentCheckout(
  params: CreatePaymentCheckoutParams,
): Promise<CreatePaymentCheckoutResult> {
  const {
    prisma,
    accountId,
    amountClp,
    description,
    publicOrigin,
    vault,
  } = params;

  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) {
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  const tx = await prisma.transaction.create({
    data: {
      accountId,
      amount: new Decimal(amountClp),
      currency: account.currency,
      type: 'INGRESO',
      concept: description.slice(0, 500),
      status: 'PENDIENTE',
      source: 'payment_checkout',
    },
  });

  const bridge = EngineRegistry.use<ExternalBridgeEngineApi>(
    'external-bridge-engine',
  );
  const link = await bridge.createCheckoutLink(
    {
      amountClp,
      description,
      transactionId: tx.id,
      publicOrigin,
    },
    vault,
  );

  return {
    transactionId: tx.id,
    ...link,
  };
}

export type PaymentsSubEngineApi = {
  createPaymentCheckout: typeof createPaymentCheckout;
};

const api: PaymentsSubEngineApi = {
  createPaymentCheckout,
};

try {
  EngineRegistry.register(SUB_ENGINE_ID, api);
} catch (e) {
  console.error(`[FIFER SubEngine] ${SUB_ENGINE_ID} — registro:`, e);
}

export { SUB_ENGINE_ID };
