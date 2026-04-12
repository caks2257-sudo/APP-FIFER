import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { verifyPaymentWebhookToken } from '@fifer/external-bridge-engine';

import '@/engines/finance-engine';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  transactionId: z.string().min(1),
  sig: z.string().min(1),
  event: z.enum(['payment.succeeded']).optional(),
});

/**
 * Webhook público: confirma pago y pasa `Transaction` de PENDIENTE a COMPLETADO.
 * Mock: firma HMAC del `transactionId`. Flow: stub de cabecera secreta.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } },
) {
  const provider = params.provider?.toLowerCase() ?? '';

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (provider === 'mock') {
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', issues: parsed.error.flatten() },
        { status: 422 },
      );
    }
    const { transactionId, sig } = parsed.data;
    if (!verifyPaymentWebhookToken(transactionId, sig)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }
    return finalizePendingTransaction(transactionId, request.nextUrl.origin);
  }

  if (provider === 'flow') {
    const secret =
      process.env.FLOW_WEBHOOK_SECRET?.trim() ??
      process.env.FIFER_PAYMENT_WEBHOOK_SECRET?.trim();
    const auth = request.headers.get('authorization');
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!secret || bearer !== secret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const flowParsed = z
      .object({
        transactionId: z.string().min(1),
        status: z.string().optional(),
      })
      .safeParse(json);
    if (!flowParsed.success) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 422 });
    }
    if (
      flowParsed.data.status &&
      flowParsed.data.status.toLowerCase() !== 'success'
    ) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    return finalizePendingTransaction(transactionId, request.nextUrl.origin);
  }

  return NextResponse.json({ error: 'Proveedor no soportado' }, { status: 404 });
}

async function finalizePendingTransaction(transactionId: string, publicOrigin: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { account: true },
      });

      if (!row) {
        return { error: 'NOT_FOUND' as const };
      }
      if (row.source !== 'payment_checkout') {
        return { error: 'INVALID_SOURCE' as const };
      }
      if (row.status !== 'PENDIENTE') {
        return {
          ok: true as const,
          already: true,
          status: row.status,
        };
      }
      if (row.type !== 'INGRESO') {
        return { error: 'INVALID_TYPE' as const };
      }

      const nextBalance = row.account.balance.plus(row.amount);

      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETADO' },
      });

      await tx.financialAccount.update({
        where: { id: row.accountId },
        data: { balance: nextBalance },
      });

      const acc = await tx.financialAccount.findUnique({
        where: { id: row.accountId },
      });

      return {
        ok: true as const,
        already: false,
        balance: acc!.balance.toString(),
        currency: acc!.currency,
      };
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Transacción no elegible' }, { status: 400 });
    }

    if (result.already) {
      return NextResponse.json({
        schemaVersion: '1.0-payment-webhook',
        ok: true,
        transactionId,
        already: true,
      });
    }

    queueMicrotask(() => {
      void import('@/engines/finance-engine/sub-engines/billing').then(
        ({ triggerAutoInvoiceAfterPaymentCheckout }) =>
          triggerAutoInvoiceAfterPaymentCheckout(transactionId, publicOrigin).catch(
            (e) => console.error('[billing] auto-invoice', e),
          ),
      );
    });

    return NextResponse.json({
      schemaVersion: '1.0-payment-webhook',
      ok: true,
      transactionId,
      already: false,
      balance: result.balance,
      currency: result.currency,
    });
  } catch (e) {
    console.error('[webhooks/payments]', e);
    return NextResponse.json(
      { error: 'Error al finalizar pago' },
      { status: 500 },
    );
  }
}
