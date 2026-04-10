# 🔌 FIFER — Mapa de integraciones y conectividad

> **Propósito:** Base de datos de diagnóstico del ecosistema: estado de APIs externas, **razones de inactividad** (llaves, tokens, red, certificados) y vínculo con **semillas** y **autosanación JIT** (`BoxLoader` → Modo Discovery).

**Contrato de datos en UI:** [`_xray_PROTOCOL_SHELL.md`](../_xray_PROTOCOL_SHELL.md) (`BoxProps`, `FiferBoxDataNormalized`, `toBoxPropsData`).  
**Semillas TypeScript (panel Next):** [`fifer-landing/src/mocks/`](../fifer-landing/src/mocks/) — `finance-data.ts`, `content-data.ts`, `affiliate-data.ts`.

---

## Estado de salud por servicio

| Servicio | Status | Tipo de fallo típico | Razón de inactividad | Acción requerida | Último check |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Shopify (tienda ABKupfer)** | 🟢 Activa | — | N/A | Ninguna | 2026-04-08 |
| **MercadoLibre** | 🔴 Inactiva | **Credenciales** | Falta Client Secret / API Key en perfil o vault BYOK | Ingresar credenciales en Perfil / `fifer_auth.user_api_keys` | 2026-04-08 |
| **Meta Ads (Instagram / Facebook)** | 🟡 Warning | **Token / autorización** | Token de larga duración vencido o falta re-auth OAuth | Usuario autoriza de nuevo en el panel (Business / Marketing API) | 2026-04-07 |
| **Google Ads / Shopping** | 🔴 Inactiva | **Credenciales** | Falta API Key / OAuth de Google Ads; campañas pausadas en mock | Inyectar llave o conectar cuenta en integraciones | 2026-04-08 |
| **OpenAI (modelos IA)** | 🟢 Activa | — | BYOK verificado | Ninguna | 2026-04-08 |
| **API Municipal (Chicureo)** | ⚪ Ghost | **Origen de datos** | API no pública; scraper o mocks hasta nueva versión | Mantener mocks en `fifer-landing/src/mocks/finance-data.ts` | 2026-04-05 |
| **Transbank** | 🔴 Inactiva | **Infra / certificado** | Certificado .crt vencido o mal montado en servidor | Actualizar certificados en el server y variables de entorno | 2026-04-01 |

### Leyenda de tipos (autosanación)

| Tipo | Códigos / señales | Qué hace el sistema |
| :--- | :--- | :--- |
| **Credenciales** | 401, `invalid_client`, “API Key” ausente | Discovery + copy hacia BYOK / perfil; no reintentar infinito sin llave. |
| **Token / autorización** | 403, `invalid_grant`, `token_expired` | Discovery + flujo “Reconectar” / re-OAuth. |
| **Red / disponibilidad** | 5xx, timeout, `ECONNREFUSED` | Reintento con backoff; si persiste, actualizar fila **Status** aquí. |
| **Infra / certificado** | TLS handshake, cert expired | Bloquear cobro hasta IT actualice certs (Transbank, webhooks). |

---

## 🛠️ Protocolo de reporte (Cursor)

**Norma global:** **`.cursorrules` §0.2 — Protocolo de Cierre Obligatorio** — mantener este archivo alineado con cambios de integración forma parte del cierre de tarea.

Si una integración **falla** en desarrollo o producción, Cursor **DEBE**:

1. Identificar **código HTTP** o mensaje (401 / 403 / 500 / timeout).
2. Clasificar el **tipo de fallo** (tabla anterior).
3. **Actualizar esta tabla** (Status, Razón, Último check).
4. Alinear UI: `BoxLoader` → **Modo Discovery** / mensaje alineado con la razón documentada.

---

## Semillas (mocks) y proyectos

| Ámbito | Archivo | Contenido resumido |
| :--- | :--- | :--- |
| Finanzas Chicureo | `fifer-landing/src/mocks/finance-data.ts` | UF, proyectos de regularización, estados municipales, flujo de caja. |
| Contenido ABKupfer | `fifer-landing/src/mocks/content-data.ts` | Productos (roble, cladding), mini-series IA, campañas (incl. Google pausada sin API Key). |
| Afiliados | `fifer-landing/src/mocks/affiliate-data.ts` | Red, comisiones, estados. |

Todos exportan objetos compatibles con **`BoxProps.data`** vía **`toBoxPropsData`** (`utils/adapters.ts`), según **`_xray_PROTOCOL_SHELL.md`**.
