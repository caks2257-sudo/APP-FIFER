/**
 * Integración Tasklet: disparo de auditoría financía y callback de webhooks.
 */

export type TriggerFinanceAuditResult =
  | { ok: true; mode: 'mock' }
  | { ok: true; mode: 'live'; status: number }
  | { ok: false; error: string };

const FINANCE_AUDIT_EVENT = 'finance.audit' as const;

/**
 * Encola / envía una auditoría financiera al webhook de Tasklet (POST JSON).
 * Sin `TASKLET_API_KEY` opera en modo MOCK (sin red, éxito simulado).
 */
export async function triggerFinanceAudit(accountId: string): Promise<TriggerFinanceAuditResult> {
  try {
    const apiKey = process.env.TASKLET_API_KEY?.trim();

    if (!apiKey) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 280);
      });
      return { ok: true, mode: 'mock' };
    }

    const webhookUrl = process.env.TASKLET_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      return {
        ok: false,
        error:
          'TASKLET_WEBHOOK_URL no está definida. Configúrala junto con TASKLET_API_KEY para envío real.',
      };
    }

    const body = {
      event: FINANCE_AUDIT_EVENT,
      accountId,
      requestedAt: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Fifer-Integration': 'tasklet',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        error: `Tasklet respondió ${res.status}${text ? `: ${text.slice(0, 240)}` : ''}`,
      };
    }

    return { ok: true, mode: 'live', status: res.status };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido al contactar Tasklet';
    return { ok: false, error: message };
  }
}

/**
 * Procesamiento posterior al registro en `integration_callback_events` (extensible).
 */
export async function handleTaskletCallback(eventId: string, payload: unknown): Promise<void> {
  void eventId;
  void payload;
}
