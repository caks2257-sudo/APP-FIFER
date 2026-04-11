# Cascada de rescate — Sub-Engine `comms` (`ai-fallback:comms`)

Orden de intentos cuando el usuario es **Pro** (`core.tier === 'pro'`). Los usuarios **Free** no entran en esta cascada: siempre **Mock** (ver `_xray_CONTRACT.md`).

## Canal `whatsapp`

1. **Twilio** — `POST /2010-04-01/Accounts/{AccountSid}/Messages.json` con `From` = `TWILIO_WHATSAPP_FROM`, `To` = `whatsapp:{to}` (E.164 sin prefijo duplicado si `to` ya incluye `+`).
2. **SendGrid** — Si Twilio falla o no está configurado: correo de rescate al mismo destino **si** `to` parece email; si `to` es teléfono, usar variable `FIFER_ADMIN_EMAIL` como buzón de rescate con asunto `[FIFER] Rescate WhatsApp` y cuerpo que incluye el texto original y el número intentado.
3. **Mock** — Log estructurado en consola; respuesta `ok: true`, `channel: 'mock'`.

## Canal `email`

1. **SendGrid** — `POST /v3/mail/send` con remitente `FIFER_SENDGRID_FROM`.
2. **Mock** — Sin Twilio en este canal (Twilio no cubre SMTP genérico en este Micro-Core).

## Notas operativas

- Timeouts cortos en `fetch` para no bloquear workers.
- No registrar secretos en logs; truncar cuerpos largos en trazas mock.
