# FIFER — Mapa de salud de APIs (`_xray_INTEGRATIONS`)

> **Rol:** Sensor de pulso de conexiones externas: estado operativo, diagnóstico de fallas y acciones correctivas. Este archivo es la **fuente operativa** para integraciones; Cursor lo mantiene al día cuando el código o el runtime revelan errores de auth o permisos.

**Relacionado:** [`_xray_INTEGRATIONS.md`](../_xray_INTEGRATIONS.md) en la raíz del repo (vista ampliada con mocks y protocolo UI). Preferir **esta** ruta para el checklist de conectividad con latencia.

---

## Tabla de conectividad

| Servicio | Status | Razón de falla | Acción requerida | Latencia |
| :--- | :---: | :--- | :--- | :--- |
| **Shopify (ABKupfer)** | 🟢 | — | Ninguna | — |
| **MercadoLibre** | 🔴 | Credenciales ausentes o inválidas en vault / perfil | Ingresar Client ID, Client Secret y tokens en BYOK / `user_api_keys` | — |
| **Meta Ads** | 🟡 | Token largo vencido o alcance insuficiente | Reautorizar OAuth (Marketing API / Business) | — |
| **OpenAI** | 🟢 | — | Ninguna (verificar BYOK en prod) | — |
| **Google Cloud (Vertex / AI Studio)** | 🟡 | Proyecto, API habilitada o credenciales de servicio | Habilitar APIs, IAM y `GOOGLE_APPLICATION_CREDENTIALS` o workload identity | — |
| **Transbank** | 🔴 | Certificado TLS / ambiente o credenciales de comercio | Renovar `.crt`, alinear `.env` y ambiente (integración vs producción) | — |
| **APIs municipales (Chicureo)** | 🟡 | Origen no expuesto o rate limit | Confirmar endpoint oficial o mantener mocks hasta API estable | — |

**Leyenda:** 🟢 OK · 🟡 degradado / pendiente · 🔴 caído o bloqueado.

**Latencia:** Tiempo ida y vuelta típico (p50) en ms, o `—` si no hay medición reciente. Actualizar tras probes o logs de gateway.

---

## Catálogo de servicios

| Servicio | Alcance en FIFER | Variables / secretos típicos | Notas |
| :--- | :--- | :--- | :--- |
| **Shopify (ABKupfer)** | Catálogo, pedidos, webhooks tienda | `SHOPIFY_*`, Admin API token | Tienda marca ABKupfer; respetar límites REST/GraphQL. |
| **MercadoLibre** | Publicaciones, ventas, envíos | App user token, refresh | Chile (`MLC`); revisar expiración de token. |
| **Meta Ads** | Campañas IG/FB, insights | System user o long-lived token, `ads_read` / `ads_management` | Requiere Business Manager alineado. |
| **OpenAI** | Generación de contenido, asistentes | `OPENAI_API_KEY` (BYOK) | No loguear payloads completos en texto plano. |
| **Google Cloud (Vertex / AI Studio)** | Modelos Gemini/Vertex, billing por proyecto | JSON de cuenta de servicio, proyecto GCP | Separar dev/staging/prod por proyecto. |
| **Transbank** | Webpay / Oneclick según producto | Código comercio, API Key, certificados | Validar ambiente y vigencia de cert. |
| **APIs municipales (Chicureo)** | Trámites, normativa local, datos territorio | Según convenio / API key municipal | Si no hay API pública, usar mocks documentados en landing. |
| **ElevenLabs** | TTS (listado de voces vía health monitor) | `ELEVENLABS_API_KEY` o `XI_API_KEY` | Probe: `GET /v1/voices` + header `xi-api-key`; sin clave → `unconfigured` / «Falta Auth Key». |
| **Deepgram** | STT (proyectos vía health monitor) | `DEEPGRAM_API_KEY` | Probe: `GET /v1/projects` + `Authorization: Token …`. |
| **AssemblyAI** | STT (listado de transcripts vía health monitor) | `ASSEMBLYAI_API_KEY` | Probe: `GET /v2/transcript?limit=1` + `Authorization` (API key en bruto). |
| **PlayHT** | TTS (listado de voces vía health monitor) | `PLAYHT_API_KEY` o `PLAYHT_SECRET_KEY` + `PLAYHT_USER_ID` | Probe: `GET https://api.play.ht/api/v2/voices` + `Authorization: Bearer …` y `X-User-ID`. |
| **DeepSeek** | LLM (health monitor) | `DEEPSEEK_API_KEY` | Probe: `GET https://api.deepseek.com/models` + `Authorization: Bearer …`. |
| **Voyage AI** | Embeddings / RAG (health monitor) | `VOYAGE_API_KEY`; opc. `VOYAGE_HEALTH_EMBED_MODEL` | Sin `GET /v1/models` público: probe `POST /v1/embeddings` mínimo (coste simbólico por ciclo). |
| **Smart Task Router** | Enrutado multi-proveedor (`src/services/ai/ai_task_router.js`) | Lee `api_health_status` vía Supabase service role; claves según proveedor elegido | Failover por `taskType`; tras éxito escribe `fifer_finance.ai_usage_logs` (actual vs baseline). `GET .../finance/cost-savings` agrega ahorro del mes. |

---

## Regla de auto-actualización (Cursor)

Cuando una llamada HTTP a una API integrada devuelva:

| Código | Significado | Qué hacer en este archivo |
| :--- | :--- | :--- |
| **401** | Autenticación fallida (llave ausente, token inválido, firma incorrecta) | Poner **Status** en 🔴 o 🟡 según gravedad; en **Razón de falla** indicar *falta o invalidez de credencial / token*; en **Acción requerida** indicar rotación de llave, BYOK o re-login. |
| **403** | Autenticado pero sin permiso (alcance, IP, recurso prohibido) | **Status** 🟡 o 🔴; **Razón de falla** *permiso o alcance insuficiente*; **Acción requerida** revisar IAM, scopes OAuth, o política en el proveedor. |

**Obligatorio tras 401/403:** actualizar la fila del **Servicio** afectado en la **Tabla de conectividad** en el mismo cambio de código o en el cierre de la tarea que detectó el error (no dejar el mapa en 🟢 si el runtime acaba de negar acceso).

**Opcional:** anotar **Latencia** si el error vino acompañado de tiempo de respuesta medible (timeout ≠ latencia; documentar como `timeout` en Razón si aplica).

---

## Auditoría rompecircuitos (runtime)

*Líneas añadidas automáticamente en **desarrollo** cuando un **Box** abre el circuito tras fallos consecutivos (`src/core/CircuitBreaker.ts` → `POST /api/dev/fifer-circuit-xray`). Cursor debe consolidar en la **Tabla de conectividad** si el fallo implica un proveedor concreto.*

*(vacío hasta el primer evento)*

---

## Checklist rápido para PR / cierre

- [ ] Tabla refleja el último error conocido de integración (401/403/5xx recurrente).
- [ ] Catálogo sigue alineado con variables reales del despliegue (sin pegar secretos en el markdown).
- [ ] Si se añade un proveedor nuevo, nueva fila en la tabla y entrada en el catálogo.

---
*Auditoría X-Ray · Última sincronización: 2026-04-08*
