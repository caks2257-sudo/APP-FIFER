/**
 * Sub-Engine `finance-engine:billing` — facturación DTE vía External Bridge (OpenFactura / SII).
 */

import '@/engines/external-bridge-engine';

import type { PrismaClient } from '@prisma/client';

import type { ExternalBridgeEngineApi } from '@fifer/external-bridge-engine';

import { loadDecryptedVault } from '@/lib/bridge-vault';
import { EngineRegistry } from '@/registry/engine-registry';

import { mapTransactionToEmitInvoiceInput } from './openfactura-mapper';

const SUB_ENGINE_ID = 'finance-engine:billing' as const;

async function resolvePublicOrigin(override?: string): Promise<string> {
  if (override?.trim()) {
    return override.replace(/\/$/, '');
  }
  try {
    const { headers } = await import('next/headers');
    const h = headers();
    const host = h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? 'http';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  } catch {
    /* sin contexto de request (jobs / microtasks) */
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export * from './openfactura-mapper';

function assertTransactionId(id: string): asserts id is string {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error('[finance-engine:billing] transactionId inválido — emisión abortada (Auto-Healing)');
  }
}

/**
 * Tras checkout completado: emite DTE si aún no hay factura.
 */
export async function triggerAutoInvoiceAfterPaymentCheckout(
  transactionId: string,
  publicOrigin: string,
): Promise<void> {
  assertTransactionId(transactionId);
  const prisma = (await import('@/lib/prisma')).prisma;
  const vault = await loadDecryptedVault();
  await emitInvoiceForTransaction(prisma, transactionId, vault, {
    onlyPaymentCheckout: true,
    publicOrigin,
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
  assertTransactionId(transactionId);

  const row = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      account: {
        include: {
          user: { include: { expediente: true } },
        },
      },
    },
  });

  if (!row) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  if (row.type !== 'INGRESO' || row.status !== 'COMPLETADO') {
    return { ok: false, reason: 'NOT_ELIGIBLE' };
  }

  if (options?.onlyPaymentCheckout && row.source !== 'payment_checkout') {
    return { ok: true, skipped: true, reason: 'not_payment_checkout' };
  }

  if (row.dteStatus === 'emitido' && row.dteFolio) {
    return { ok: true, skipped: true, reason: 'already_emitted' };
  }

  const publicOrigin = await resolvePublicOrigin(options?.publicOrigin);

  const input = mapTransactionToEmitInvoiceInput(
    row,
    {
      email: row.account.user.email,
      name: row.account.user.name,
      expediente: row.account.user.expediente,
    },
    publicOrigin,
  );

  const bridge = EngineRegistry.use<ExternalBridgeEngineApi>(
    'external-bridge-engine',
  );
  const result = await bridge.emitInvoice(input, vault);

  if (result.mode === 'MOCK' && result.folio != null && result.url_pdf) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        dteFolio: String(result.folio),
        dtePdfUrl: result.url_pdf,
        dteStatus: 'emitido',
      },
    });
    return { ok: true, folio: String(result.folio) };
  }

  if (result.mode === 'PROD') {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        dteStatus: 'pendiente',
        dtePdfUrl: null,
        dteFolio: null,
      },
    });
    return { ok: true, folio: null, reason: 'prod_pending_integration' };
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { dteStatus: 'error' },
  });
  return { ok: false, reason: 'emit_failed' };
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
