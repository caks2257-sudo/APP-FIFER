/**
 * Sub-Engine `comms` — hijo fractal de `ai-fallback-cascade` (Constitución v6.0).
 * Notificaciones WhatsApp / Email con FinOps (free → mock; pro → Twilio → SendGrid → mock).
 */

import { EngineRegistry } from "@/registry/engine-registry";
import type { CoreProfile } from "@/types/user-dna";

const SUB_ENGINE_ID = "ai-fallback:comms" as const;
const LOG_PREFIX = `[FIFER SubEngine ${SUB_ENGINE_ID}]`;

export type CommsProvider = "whatsapp" | "email";

export type CommsSendOk = {
  ok: true;
  channel: "twilio-whatsapp" | "sendgrid-email" | "mock";
  detail?: string;
};

export type CommsSendErr = {
  ok: false;
  code: string;
  reason: string;
};

export type CommsSendResult = CommsSendOk | CommsSendErr;

function isProTier(core: CoreProfile | undefined): boolean {
  return core?.tier === "pro";
}

function twilioWhatsAppTo(e164: string): string {
  const t = e164.trim();
  if (t.toLowerCase().startsWith("whatsapp:")) return t;
  const num = t.startsWith("+") ? t : `+${t.replace(/^\+/, "")}`;
  return `whatsapp:${num}`;
}

async function tryTwilioWhatsApp(
  to: string,
  body: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || !from) {
    return { ok: false, reason: "Twilio no configurado (SID/token/from)." };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({
    From: from,
    To: twilioWhatsAppTo(to),
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    return {
      ok: false,
      reason: raw.trim() || `Twilio HTTP ${res.status}`,
    };
  }
  return { ok: true };
}

async function trySendGridEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.FIFER_SENDGRID_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, reason: "SendGrid no configurado (API key / from)." };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    return {
      ok: false,
      reason: raw.trim() || `SendGrid HTTP ${res.status}`,
    };
  }
  return { ok: true };
}

function mockSend(
  to: string,
  body: string,
  provider: CommsProvider,
  note?: string
): CommsSendOk {
  const preview =
    body.length > 280 ? `${body.slice(0, 280)}…` : body;
  console.info(
    `${LOG_PREFIX} MOCK ${provider} → to=${to} :: ${preview}`,
    note ? `(${note})` : ""
  );
  return {
    ok: true,
    channel: "mock",
    detail: note ?? "FinOps free o cascada agotada; sin envío real.",
  };
}

export class CommsSubEngine {
  readonly id = SUB_ENGINE_ID;

  /**
   * Envío gobernado por FinOps: free → mock; pro → Twilio (WhatsApp) / SendGrid (email) con rescates.
   */
  async send(
    to: string,
    body: string,
    provider: CommsProvider,
    core?: CoreProfile
  ): Promise<CommsSendResult> {
    const dest = to?.trim();
    const text = body?.trim();
    if (!dest) {
      return { ok: false, code: "COMMS_BAD_TO", reason: "Destino `to` vacío." };
    }
    if (!text) {
      return { ok: false, code: "COMMS_BAD_BODY", reason: "Cuerpo vacío." };
    }

    if (!isProTier(core)) {
      return mockSend(dest, text, provider, "tier free — solo mock");
    }

    if (provider === "email") {
      const r1 = await trySendGridEmail(dest, "FIFER notificación", text);
      if (r1.ok) {
        return { ok: true, channel: "sendgrid-email" };
      }
      return mockSend(dest, text, provider, `SendGrid: ${r1.reason}`);
    }

    const w1 = await tryTwilioWhatsApp(dest, text);
    if (w1.ok) {
      return { ok: true, channel: "twilio-whatsapp" };
    }

    const adminEmail = process.env.FIFER_ADMIN_EMAIL?.trim();
    if (adminEmail) {
      const rescueBody = [
        "[FIFER] Rescate tras fallo WhatsApp (Twilio).",
        `Destino intentado: ${dest}`,
        `Motivo Twilio: ${w1.reason}`,
        "---",
        text,
      ].join("\n");
      const r2 = await trySendGridEmail(
        adminEmail,
        "[FIFER] Rescate WhatsApp → correo",
        rescueBody
      );
      if (r2.ok) {
        return {
          ok: true,
          channel: "sendgrid-email",
          detail: "WhatsApp falló; notificación vía correo al administrador.",
        };
      }
      return mockSend(dest, text, provider, `Twilio: ${w1.reason} | SendGrid: ${r2.reason}`);
    }

    return mockSend(dest, text, provider, `Twilio: ${w1.reason} | sin FIFER_ADMIN_EMAIL para rescate`);
  }
}

try {
  EngineRegistry.register(SUB_ENGINE_ID, new CommsSubEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro o fase de carga:`, error);
}

try {
  void SUB_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
