/**
 * Sub-Engine `finance-engine:reconciliation` — sincronización bancaria vía External Bridge.
 */

import '@/engines/external-bridge-engine';

import type { PrismaClient } from '@prisma/client';

import type {
  BankingTransactionsResult,
  ExternalBridgeEngineApi,
} from '@fifer/external-bridge-engine';

import {
  ReconciliationApplyInputSchema,
  ReconciliationApplyOutput,
  ReconciliationApplyOutputSchema,
  ReconciliationPreviewInputSchema,
  ReconciliationPreviewOutput,
  ReconciliationPreviewOutputSchema,
} from '@/engines/finance-engine/schemas';
import { EngineRegistry } from '@/registry/engine-registry';

const SUB_ENGINE_ID = 'finance-engine:reconciliation' as const;
const BANKING_AGENT_ID = 'fintoc' as const;

async function loadBankSnapshot(
  vault: Parameters<ExternalBridgeEngineApi['getBankingTransactions']>[0],
): Promise<BankingTransactionsResult> {
  const bridge = EngineRegistry.use<ExternalBridgeEngineApi>(
    'external-bridge-engine',
  );
  return bridge.getBankingTransactions(vault);
}

/**
 * Adaptador liviano: valida payload y delega el snapshot al agente bancario.
 */
export async function previewBankReconciliation(
  prisma: PrismaClient,
  accountId: string,
  vault: Parameters<ExternalBridgeEngineApi['getBankingTransactions']>[0],
): Promise<ReconciliationPreviewOutput> {
  const validated = ReconciliationPreviewInputSchema.parse({
    prisma,
    accountId,
    vault,
  });
  const bank = await loadBankSnapshot(validated.vault);
  const envelope = {
    agentId: BANKING_AGENT_ID,
    payload: bank.transactions.map((t) => ({
      externalId: t.externalId,
      postedAt: t.postedAt.toISOString(),
      amountClp: t.amountClp,
      type: t.type,
      concept: t.concept,
    })),
  };
  return ReconciliationPreviewOutputSchema.parse({
    bridgeMode: bank.mode,
    pendingCount: envelope.payload.length,
    newMovements: envelope.payload,
  });
}

/**
 * Adaptador liviano: delega la conciliación sin persistencia local.
 */
export async function applyBankReconciliation(
  prisma: PrismaClient,
  accountId: string,
  vault: Parameters<ExternalBridgeEngineApi['getBankingTransactions']>[0],
): Promise<ReconciliationApplyOutput> {
  const validated = ReconciliationApplyInputSchema.parse({
    prisma,
    accountId,
    vault,
  });
  const preview = await previewBankReconciliation(
    validated.prisma as PrismaClient,
    validated.accountId,
    validated.vault,
  );
  const saveIds = preview.newMovements.map((m) => m.externalId);
  return ReconciliationApplyOutputSchema.parse({
    bridgeMode: preview.bridgeMode,
    savedCount: saveIds.length,
    savedIds: saveIds,
    balance: '0',
    currency: 'CLP',
  });
}

export type ReconciliationSubEngineApi = {
  previewBankReconciliation: typeof previewBankReconciliation;
  applyBankReconciliation: typeof applyBankReconciliation;
};

const api: ReconciliationSubEngineApi = {
  previewBankReconciliation,
  applyBankReconciliation,
};

try {
  EngineRegistry.register(SUB_ENGINE_ID, api);
} catch (e) {
  console.error(`[FIFER SubEngine] ${SUB_ENGINE_ID} — registro:`, e);
}

export { SUB_ENGINE_ID };
