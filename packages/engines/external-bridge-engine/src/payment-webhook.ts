import { createHmac, timingSafeEqual } from 'node:crypto';

function getPaymentWebhookSecret(): string {
  const s = process.env.FIFER_PAYMENT_WEBHOOK_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== 'production') {
    return 'fifer-dev-payment-webhook';
  }
  return '';
}

/**
 * Firma HMAC-SHA256 del id de transacción (webhook mock / confirmación).
 */
export function signPaymentWebhookToken(transactionId: string): string {
  const secret = getPaymentWebhookSecret();
  if (!secret) {
    throw new Error('FIFER_PAYMENT_WEBHOOK_SECRET no configurada');
  }
  return createHmac('sha256', secret).update(transactionId).digest('hex');
}

export function verifyPaymentWebhookToken(
  transactionId: string,
  token: string,
): boolean {
  const secret = getPaymentWebhookSecret();
  if (!secret || !token) return false;
  try {
    const expected = createHmac('sha256', secret)
      .update(transactionId)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(token, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
