# Contrato X-Ray — Sub-Engine `comms` (`ai-fallback:comms`)

Micro-Core hijo del motor `ai-fallback-cascade`. Notificaciones salientes (WhatsApp / correo) con gobernanza FinOps por `CoreProfile.tier`.

## API pública — `send(to, body, provider, core?)`

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `to` | `string` | Sí | Destino canónico: número E.164 (p. ej. `+56912345678`) si `provider === 'whatsapp'`; dirección RFC 5322 si `provider === 'email'`. |
| `body` | `string` | Sí | Texto plano del mensaje (asunto en rescate por correo lo fija el motor). |
| `provider` | `'whatsapp' \| 'email'` | Sí | Canal solicitado. |
| `core` | `CoreProfile` | No | Si se omite se asume **free** (solo mock). |

## Salida — `Promise<CommsSendResult>`

Unión discriminada:

- **Éxito:** `{ ok: true; channel: 'twilio-whatsapp' | 'sendgrid-email' | 'mock'; detail?: string }`
- **Error:** `{ ok: false; code: string; reason: string }`

## FinOps (Cap. 6)

- **`tier !== 'pro'`** (o `tier` ausente): solo **`mock`** — registro en consola del servidor; no se invocan Twilio ni SendGrid aunque existan claves.
- **`tier === 'pro'`**: cascada real según `_xray_HEALING.md` (Twilio → SendGrid → Mock).

## Variables de entorno (integración real)

- **Twilio (WhatsApp):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (p. ej. `whatsapp:+14155238886`)
- **SendGrid (email):** `SENDGRID_API_KEY`, `FIFER_SENDGRID_FROM` (remitente verificado)

## Registro en runtime

Sub-motor registrado como **`ai-fallback:comms`**. Resolver con `EngineRegistry.use<CommsSubEngine>('ai-fallback:comms')`.
