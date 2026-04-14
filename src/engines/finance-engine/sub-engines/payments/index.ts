/**
 * Sub-Engine `finance-engine:payments` — checkout externo vía External Bridge.
 */

import '@/engines/external-bridge-engine';

import type { PrismaClient } from '@prisma/client';

import type {
  CreateCheckoutLinkResult,
  ExternalBridgeEngineApi,
} from '@fifer/external-bridge-engine';

import { CreatePaymentCheckoutInputSchema, CreatePaymentCheckoutOutputSchema } from '@/engines/finance-engine/schemas';
import { EngineRegistry } from '@/registry/engine-registry';

const SUB_ENGINE_ID = 'finance-engine:payments' as const;
const PAYMENTS_AGENT_ID = 'tasklet' as const;

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
 * Adaptador liviano: valida payload y delega checkout al External Bridge.
 */
export async function createPaymentCheckout(
  params: CreatePaymentCheckoutParams,
): Promise<CreatePaymentCheckoutResult> {
  const validated = CreatePaymentCheckoutInputSchema.parse(params);

  const bridge = EngineRegistry.use<ExternalBridgeEngineApi>(
    'external-bridge-engine',
  );
  const envelope = {
    agentId: PAYMENTS_AGENT_ID,
    payload: {
      amountClp: validated.amountClp,
      description: validated.description,
      transactionId: validated.accountId,
      publicOrigin: validated.publicOrigin,
    },
  };
  const link = await bridge.createCheckoutLink(
    {
      ...envelope.payload,
    },
    validated.vault,
  );

  const output = {
    transactionId: envelope.payload.transactionId,
    ...link,
  };
  return CreatePaymentCheckoutOutputSchema.parse(output);
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
