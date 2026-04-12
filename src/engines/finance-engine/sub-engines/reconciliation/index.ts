/**
 * Sub-Engine `finance-engine:reconciliation` — sincronización bancaria vía External Bridge.
 */

import '@/engines/external-bridge-engine';

import { Decimal } from '@prisma/client/runtime/library';
import type { PrismaClient } from '@prisma/client';

import type {
  BankingTransactionsResult,
  ExternalBridgeEngineApi,
} from '@fifer/external-bridge-engine';

import { EngineRegistry } from '@/registry/engine-registry';

import type {
  BankReconciliationApplyResult,
  BankReconciliationPreviewResult,
  ReconciliationNewMovement,
} from './types';

export * from './types';

const SUB_ENGINE_ID = 'finance-engine:reconciliation' as const;

function toMovement(bt: {
  externalId: string;
  postedAt: Date;
  amountClp: number;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
}): ReconciliationNewMovement {
  return {
    externalId: bt.externalId,
    postedAt: bt.postedAt.toISOString(),
    amountClp: bt.amountClp,
    type: bt.type,
    concept: bt.concept,
  };
}

/** Dedup por bankExternalId; respaldo por huella fecha+monto+glosa normalizada. */
function fingerprintFromBank(bt: {
  postedAt: Date;
  amountClp: number;
  concept: string;
}): string {
  const iso = bt.postedAt.toISOString().slice(0, 10);
  return `${iso}|${bt.amountClp}|${bt.concept.trim().toLowerCase()}`;
}

async function loadBankSnapshot(
  vault: Parameters<ExternalBridgeEngineApi['getBankingTransactions']>[0],
): Promise<BankingTransactionsResult> {
  const bridge = EngineRegistry.use<ExternalBridgeEngineApi>(
    'external-bridge-engine',
  );
  return bridge.getBankingTransactions(vault);
}

/**
 * Compara movimientos del banco (Bridge) con `Transaction` en Prisma y devuelve solo los no importados.
 */
export async function previewBankReconciliation(
  prisma: PrismaClient,
  accountId: string,
  vault: Parameters<ExternalBridgeEngineApi['getBankingTransactions']>[0],
): Promise<BankReconciliationPreviewResult> {
  const bank = await loadBankSnapshot(vault);

  const existing = await prisma.transaction.findMany({
    where: { accountId },
    select: {
      bankExternalId: true,
      bankPostedAt: true,
      amount: true,
      concept: true,
    },
  });

  const byExternal = new Set(
    existing
      .map((e) => e.bankExternalId)
      .filter((x): x is string => Boolean(x)),
  );

  const fingerprints = new Set<string>();
  for (const e of existing) {
    if (e.bankPostedAt) {
      fingerprints.add(
        fingerprintFromBank({
          postedAt: e.bankPostedAt,
          amountClp: Number(e.amount),
          concept: e.concept,
        }),
      );
    }
  }

  const newMovements: ReconciliationNewMovement[] = [];
  for (const bt of bank.transactions) {
    if (byExternal.has(bt.externalId)) continue;
    const fp = fingerprintFromBank(bt);
    if (fingerprints.has(fp)) continue;
    newMovements.push(toMovement(bt));
  }

  return {
    bridgeMode: bank.mode,
    pendingCount: newMovements.length,
    newMovements,
  };
}

/**
 * Persiste movimientos nuevos con `status` COMPLETADO y actualiza saldo de la cuenta.
 */
export async function applyBankReconciliation(
  prisma: PrismaClient,
  accountId: string,
  vault: Parameters<ExternalBridgeEngineApi['getBankingTransactions']>[0],
): Promise<BankReconciliationApplyResult> {
  const preview = await previewBankReconciliation(prisma, accountId, vault);
  if (preview.newMovements.length === 0) {
    const acc = await prisma.financialAccount.findUnique({
      where: { id: accountId },
    });
    return {
      bridgeMode: preview.bridgeMode,
      savedCount: 0,
      savedIds: [],
      balance: acc?.balance.toString() ?? '0',
      currency: acc?.currency ?? 'CLP',
    };
  }

  const bank = await loadBankSnapshot(vault);
  const toSave = bank.transactions.filter((bt) =>
    preview.newMovements.some((m) => m.externalId === bt.externalId),
  );

  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.financialAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    let balance = account.balance;
    const savedIds: string[] = [];

    for (const bt of toSave) {
      const delta = new Decimal(bt.amountClp);
      const nextBalance =
        bt.type === 'INGRESO' ? balance.plus(delta) : balance.minus(delta);

      const row = await tx.transaction.create({
        data: {
          accountId,
          amount: delta,
          currency: account.currency,
          type: bt.type,
          concept: bt.concept,
          status: 'COMPLETADO',
          source: 'bank_sync',
          bankExternalId: bt.externalId,
          bankPostedAt: bt.postedAt,
        },
      });
      savedIds.push(row.id);
      balance = nextBalance;
    }

    await tx.financialAccount.update({
      where: { id: accountId },
      data: { balance },
    });

    const updated = await tx.financialAccount.findUnique({
      where: { id: accountId },
    });

    return {
      savedIds,
      balance: updated!.balance.toString(),
      currency: updated!.currency,
    };
  });

  return {
    bridgeMode: preview.bridgeMode,
    savedCount: result.savedIds.length,
    savedIds: result.savedIds,
    balance: result.balance,
    currency: result.currency,
  };
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
