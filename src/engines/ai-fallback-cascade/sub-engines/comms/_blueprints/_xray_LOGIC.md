# Espejo X-Ray — lógica (`sub-engines/comms/index.ts`)

## UBICACIÓN LÓGICA

FIFER://engines/ai-fallback-cascade/sub-engines/comms


**Archivo:** `index.ts`. `EngineRegistry.register("ai-fallback:comms", new CommsSubEngine())`.

---

## Tipos exportados

| Tipo | Definición |
|------|------------|
| `CommsProvider` | `"whatsapp" \| "email"` |
| `CommsSendOk` | `{ ok: true; channel: "twilio-whatsapp" \| "sendgrid-email" \| "mock"; detail?: string }` |
| `CommsSendErr` | `{ ok: false; code: string; reason: string }` |
| `CommsSendResult` | `CommsSendOk \| CommsSendErr` |

---

## Helpers

| Función | Comportamiento |
|---------|------------------|
| `isProTier(core)` | `core?.tier === "pro"`. |
| `twilioWhatsAppTo(e164)` | Normaliza a prefijo `whatsapp:` + número. |
| `tryTwilioWhatsApp(to, body)` | Requiere `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`. POST form a `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` con Basic auth. |
| `trySendGridEmail(to, subject, body)` | Requiere `SENDGRID_API_KEY`, `FIFER_SENDGRID_FROM`. POST JSON a `https://api.sendgrid.com/v3/mail/send`. |
| `mockSend(to, body, provider, note?)` | `console.info` con preview truncada 280 chars; retorna `ok: true`, `channel: "mock"`. |

---

## Clase `CommsSubEngine`

- `readonly id = "ai-fallback:comms"`
- `send(to, body, provider, core?)`:

| Paso | Condición | Resultado |
|------|-----------|-----------|
| Validación | `to` o `body` vacío tras trim | `COMMS_BAD_TO` / `COMMS_BAD_BODY` |
| Free | `!isProTier(core)` | siempre `mockSend(..., "tier free — solo mock")` |
| Pro + email | `provider === "email"` | `trySendGridEmail` → OK → `sendgrid-email`; fallo → `mockSend` con razón SendGrid |
| Pro + whatsapp | resto | `tryTwilioWhatsApp` → OK → `twilio-whatsapp` |
| Rescate WhatsApp | Twilio falla y existe `FIFER_ADMIN_EMAIL` | `trySendGridEmail` al admin con cuerpo de rescate; OK → `sendgrid-email` con `detail` explicando rescate |
| Fin | Twilio falla y no hay rescate SendGrid | `mockSend` con motivos Twilio ± admin email ausente |

---

## Dependencias

- `@/registry/engine-registry`
- `@/types/user-dna` (`CoreProfile`)
- `fetch`, `Buffer` (Twilio Basic auth)

No hay persistencia ni cola; envíos síncronos en cadena según la tabla anterior.
## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- reason
- body
- trim
- dest
- twilio
- error
- provider
- whatsapp
- mock
- sendgrid
- email
- process
- channel
- mocksend

