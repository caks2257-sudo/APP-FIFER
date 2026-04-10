# FIFER — Torre de control (salud global + UI)

Índice de micro-frontends y **salud visual** por app. **Estado del ecosistema:** 100 % mapeado en X-Rays locales, con **Boxes + límites de error** en el frontend y **workers / API** documentados en el motor; arquitectura **resiliente** ante fallos parciales (JIT, boundaries, safe boot).

### Protocolo IA — Post-intervención (escaneo quirúrgico documental)

**Ley maestra:** **`.cursorrules` §0.2 — Protocolo de Cierre Obligatorio** (documentación + ADN Deep Navy / Electric Yellow + contrato Fifer Box).

Tras **cada** intervención **significativa** (comportamiento, rutas, contratos, integraciones, UI visible, nuevos `boxId`):

1. Actualizar el **`_xray_v0_local.md`** del paquete tocado (si existe).
2. Si el cambio es **global** (nueva app, ruta, salud del ecosistema, dependencias cruzadas): **editar este archivo** y **actualizar obligatoriamente** la línea **«Última sincronización índice»** abajo (fecha **YYYY-MM-DD**).
3. Si cambió el contrato shell/SDUI: actualizar **`_xray_PROTOCOL_SHELL.md`**.
4. Si cambió integraciones o diagnóstico de conectividad: actualizar **`_xray_INTEGRATIONS.md`**.
5. Validar UI nueva contra **`docs/styleguide.md`** y **`_xray_v0_MASTER.md`** (ADN **Deep Navy** + **Electric Yellow**, contrato Box).
6. **Sincronización externa (v0_pack / Drive):** Actualizar **`v0_pack/99_SYNC_REPORT.md`** y **`v0_pack/DNA_RULES_SNAPSHOT.md`** antes de finalizar la tarea (bitácora de sync; el snapshot obligatorio si se editó **`.cursorrules`** — **§0.12**).

**Protocolo de escaneo de código (referencia):** carpeta `fifer-landing/temp-frontend` **comprobada ausente en disco**; no forma parte del ecosistema. Aislamiento por módulo vía **`_xray_v0_local.md`** (+ HYBRID_BRIDGE / MASTER cuando toque). **Frontend productivo único:** **`fifer-landing/src/app/`** (Next.js 14).

**Chasis UI maestro:** [`_xray_v0_MASTER.md`](_xray_v0_MASTER.md)  
**Contrato shell:** [`_xray_PROTOCOL_SHELL.md`](_xray_PROTOCOL_SHELL.md) · *En `v0_pack/`, espejo:* `03_PROTOCOL_SHELL.md`  
**Manual IAs externas (v0 + Lovable):** [`_xray_HYBRID_BRIDGE.md`](_xray_HYBRID_BRIDGE.md)

**Última sincronización índice:** **2026-04-09**

**Esquema reciente (suscripción / router):** `fifer_auth.user_profile` (`user_id` PK → `auth.users`, `subscription_tier` `free`|`pro`, `tier_expires_at`); `fifer_platform.ai_capabilities.requires_pro` (boolean, catálogo PRO para UI). API: `GET /api/v1/master/user/subscription` (tier + `byok_openai` / `byok_anthropic`). Smart Task Router: `src/services/ai/ai_task_router.js` — contexto `{ userId, userTier }`, degradación free→DeepSeek / fal video, excepción BYOK. UI: `fifer-landing/src/app/(dashboard)/campaigns/page.tsx` (listas voces/modelos + modal PRO).

**Pagos (Stripe Revenue Engine):** `npm run api` arranca `src/api/http_server.js` — **antes** de `express.json()` se monta `POST /api/v1/master/stripe/webhook` con **`express.raw({ type: "application/json" })`** + `stripe.webhooks.constructEvent` (`STRIPE_WEBHOOK_SECRET`). Evento `checkout.session.completed` → `user_profile.subscription_tier = pro` y fila opcional en `fifer_finance.ledger` (`type = subscription_revenue`). Crear Checkout con `client_reference_id = <uuid usuario Supabase>`. Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (`.env.example`).

**Motores jerárquicos (API v2):** Tras `express.json()`, `GET /api/v2/engines/finance/cashflow/snapshot` exige header `x-fifer-api-key`; validación vía `src/api/gateway/apiKeyValidator.js` (scope `finance.cashflow`, permiso `read`); controlador en `src/engines/finance/sub-engines/cashflow/`.

**Fase 4 — puente Next → motor (cerrado en código):** `fifer-landing/src/lib/fifer-api-client.ts` (`fetchFiferEngine`, base `NEXT_PUBLIC_FIFER_API_BASE_URL` por defecto `http://127.0.0.1:3999`) + `src/lib/finance-snapshot-data.ts` (`getFinanceSnapshotData`). La ruta `fifer-landing/src/app/(dashboard)/finance/page.tsx` hidrata el snapshot vía el engine; **401/403** del Gateway se mapean a `isLocked` y el box muestra **`BoxLockedOverlay`** (candado amarillo sobre panel Deep Navy). *Verificación runtime:* con `PORT=3999 npm run api` en la raíz, `GET` sin header devuelve **401** y el HTML de `/finance` incluye **«Acceso Restringido»** cuando Next alcanza el motor.

---

## 🌐 Topología del Ecosistema FIFER

Mapa **solo de primer nivel** del monorepo (el detalle por app vive en cada `_xray_v0_local.md`):

```text
APP FIFER/   (raíz monorepo)
├── fifer-landing/          # Next.js 14 — UI productiva, Boxes, dashboard
├── src/                    # Motor Node/Express — API master, servicios, workers
├── fifer-content/          # Scripts Node — generación editorial (audio/video/posts)
├── fifer-ingestor/         # Scripts Node — sync masivo / afiliados
├── supabase/               # Migraciones SQL / esquemas
├── saas-fifer/             # Paquete legacy / gateway Python y módulos históricos
├── docs/                   # Documentación de plataforma
├── deliverables/           # Artefactos governance, OpenAPI, seeds
├── tests/                  # Contratos / pruebas repo
├── package.json            # Scripts raíz (p. ej. dev:safe)
├── FIFER_XRAY_REPORT.md    # (este índice maestro)
├── _xray_v0_MASTER.md
└── _xray_HYBRID_BRIDGE.md
```

**X-Ray v0 local — paquete legacy (enlace directo):** [`saas-fifer/_xray_v0_local.md`](saas-fifer/_xray_v0_local.md) — gateway Python, scripts Node y módulo `fifer-platform`; mapa desacoplado del resto del monorepo.

| Sub-app / carpeta | Dominio (2 líneas) | X-Ray local |
|-------------------|--------------------|-------------|
| **fifer-landing** | Shell Next con marketing + panel `(dashboard)`: campañas, finanzas, afiliados y logística, Boxes con JIT y `BoxErrorBoundary`. Consume el API master vía `NEXT_PUBLIC_FIFER_API_BASE_URL`. | [`fifer-landing/_xray_v0_local.md`](fifer-landing/_xray_v0_local.md) |
| **src/** (motor) | Servidor Node (`server.js`), rutas `/api/v1/master/*` y **`/api/v2/engines/*`** (sub-engines por dominio), finanzas, campañas, afiliados, pipelines IA y workers en background. Fuente de verdad de negocio para el landing. | [`src/_xray_v0_local.md`](src/_xray_v0_local.md) |
| **fifer-content** | Paquete de **scripts** de generación de contenido (orquestadores, Gemini helpers, audio/video/post); no es una app web desplegada en este árbol. | [`fifer-content/_xray_v0_local.md`](fifer-content/_xray_v0_local.md) |
| **fifer-ingestor** | Scripts de **ingesta/sync** (p. ej. AliExpress); complementa el motor; sin UI Next propia aquí. | [`fifer-ingestor/_xray_v0_local.md`](fifer-ingestor/_xray_v0_local.md) |
| **saas-fifer** | Ecosistema **legacy**: FastAPI gateway/core-service, scripts Node (afiliados, sync, plays), módulo `fifer-platform`; sin UI Next en el árbol. | [`saas-fifer/_xray_v0_local.md`](saas-fifer/_xray_v0_local.md) |

**Regla:** no duplicar árboles internos de cada aplicación en este archivo; profundizar solo en el `_xray_v0_local.md` correspondiente.

---

## Salud de Arquitectura

| Área | Estado |
|------|--------|
| **Frontend activo** | **`fifer-landing/src/app/`** — rutas, layouts `(marketing)` / `(dashboard)`, API bajo `src/app/api/`. No hay segundo frontend ni `main.tsx` / `index.html` en landing. |
| **Migración** | **Cerrada.** Cualquier export temporal fuera de Next fue retirado del repo; la UI productiva vive solo bajo `fifer-landing/src/`. |
| **TypeScript / tooling** | **`fifer-landing/tsconfig.json`** — plugin Next, alias `@/*` → `./src/*`. No existe `tsconfig.app.json` ni configuración Vitest en este paquete. |
| **Script raíz** | `npm run dev:safe` (monorepo) → pre-flight `src/server.js` + **`npm run dev` en `fifer-landing`**. |
| **Build** | `npm run build` en `fifer-landing` es la verificación de rutas y tipos del frontend. |

### Fifer Boxes — anclaje exclusivo a Next.js

Todo el sistema de Boxes opera **solo** dentro del stack Next de `fifer-landing`:

| Rol | Ruta |
|-----|------|
| Orquestador | `fifer-landing/src/components/core/BoxLoader.tsx` |
| Manifiestos (`IFiferBoxManifest`) | `fifer-landing/src/components/core/manifests/` (+ tipo en `src/types/fifer-box.ts` raíz monorepo) |
| Ingesta de piezas v0 | `fifer-landing/src/components/v0-ingestion/` |
| Lienzo / páginas que componen slots | `fifer-landing/src/app/` (p. ej. `(dashboard)/*`, componentes de dashboard) |

**No** se referencian rutas de exportaciones externas ni carpetas eliminadas para inyectar Boxes.

---

## Salud visual por app

| Módulo | Estado | Paleta activa (resumen) | X-Ray local UI |
|--------|--------|-------------------------|----------------|
| **Landing / Frontend** | 🟢 Estable | Navy `#0A0F1E` + Yellow `#EAB308` + Blue `#2563EB` | [`fifer-landing/_xray_v0_local.md`](fifer-landing/_xray_v0_local.md) |
| **Content** | 🟢 Estable | Azul `#1E3A5F` + Negro + acento Blue/Cian | [`fifer-content/_xray_v0_local.md`](fifer-content/_xray_v0_local.md) |
| **Ingestor** | 🟢 Estable · **JIT Activo** | Ámbar `#F59E0B` + carbón + esmeralda | [`fifer-ingestor/_xray_v0_local.md`](fifer-ingestor/_xray_v0_local.md) |
| **Finance** (motor `src/`) | 🟢 Estable | Verde `#059669` + Oro `#D97706` | [`src/_xray_v0_local.md`](src/_xray_v0_local.md) |
| **Afiliados** (UI en landing) | 🟢 Estable | Misma base que Landing (ver local landing + rutas `/affiliates`) | [`fifer-landing/_xray_v0_local.md`](fifer-landing/_xray_v0_local.md) |
| **Logistics** (UI en landing) | 🟢 En Desarrollo | Azul Cobalto `#1D4ED8` + Acero `#64748B` | [`fifer-landing/src/modules/logistics/_xray_v0_local.md`](fifer-landing/src/modules/logistics/_xray_v0_local.md) |
| **saas-fifer** (legacy) | 🟡 Legacy / scripts | Sin capa visual web; alinear copy futura con MASTER (Navy/Yellow) | [`saas-fifer/_xray_v0_local.md`](saas-fifer/_xray_v0_local.md) |

Marcar **🔴** si el X-Ray local documenta fallo o bloqueo activo.

---

## Destacado — Puente híbrido (v0 + Lovable)

| Campo | Valor |
|--------|--------|
| **Manual para IAs externas** | **[`_xray_HYBRID_BRIDGE.md`](_xray_HYBRID_BRIDGE.md)** — ADN, Boxes, v0, Lovable, **USER CUSTOM** al inicio |
| **Chasis global** | [`_xray_v0_MASTER.md`](_xray_v0_MASTER.md) |
| **Estado** | **🟢 Estable** — artefactos externos se integran en **`fifer-landing/src/`** (App Router + Boxes); HYBRID_BRIDGE + MASTER + local por app para prompts Cursor |

---

## Otros enlaces Micro-X-Ray (operativos)

| Recurso | Ruta |
|---------|------|
| Frontend (detalle técnico) | [`fifer-landing/_xray_frontend.md`](fifer-landing/_xray_frontend.md) |
| Finance (legacy nombre) | [`src/_xray_finance.md`](src/_xray_finance.md) |
| Content (legacy) | [`fifer-content/_xray_content.md`](fifer-content/_xray_content.md) |
| Ingestor (legacy) | [`fifer-ingestor/_xray_ingestor.md`](fifer-ingestor/_xray_ingestor.md) |
| **saas-fifer** (v0 local — topología legacy) | [`saas-fifer/_xray_v0_local.md`](saas-fifer/_xray_v0_local.md) |
| Puente v0 | [`_xray_frontend_v0_bridge.md`](_xray_frontend_v0_bridge.md) |
| **Puente híbrido (IAs externas)** | [`_xray_HYBRID_BRIDGE.md`](_xray_HYBRID_BRIDGE.md) |

---

## Gobernanza

1. **Escaneo escalonado / aislamiento total:** Para briefing a v0/Lovable (y para Cursor), **`_xray_HYBRID_BRIDGE.md`** + **`_xray_v0_MASTER.md`** + **únicamente** el **`_xray_v0_local.md`** del módulo en curso (`.cursorrules` — Protocolo Francotirador, sección 9). Los **cinco** módulos principales (Landing, `src/`, Content, Ingestor, saas-fifer) tienen X-Ray local propio; no mezclar árboles entre prompts salvo que el alcance lo exija explícitamente.  
2. **Frontend:** Solo **`fifer-landing/src/app/`** y **`fifer-landing/src/components/`** (Boxes, UI compartida); sin referencias operativas a carpetas frontend eliminadas.  
3. Tras cambios visuales/técnicos: actualizar X-Ray local y esta tabla.  
4. **Generar Prompt v0:** merge **USER** (HYBRID_BRIDGE y/o MASTER) + chasis + local de la app activa; destino de código **Next** (`v0-ingestion/` + `BoxLoader`).

🚀 META-INSTRUCCIÓN PARA GEMINI (PROMPT ORCHESTRATOR)
Tu Rol: Eres el "Fifer Prompt Orchestrator", un experto en ingeniería de prompts para v0.dev y Lovable.

Tu Misión: Cuando el usuario te pida crear una nueva interfaz o componente, no generes el código tú mismo. En su lugar, debes redactar un Prompt Maestro ultra-detallado para que v0.dev lo ejecute.

📋 Reglas de Extracción de Contexto
Anclaje Visual: Lee el archivo _xray_v0_MASTER.md para extraer los tokens de diseño (Deep Navy, Electric Yellow, Blue) y las reglas de Grid 12.

Contexto Local: Localiza en este reporte el enlace al _xray_v0_local.md de la app afectada (Finance, Content, Ingestor, etc.) para aplicar sus slots y paleta específica.

Manual de IA: Consulta _xray_HYBRID_BRIDGE.md para incluir en el prompt final las instrucciones de cómo v0 debe estructurar el archivo (Fifer Boxes, Next.js 14).

🛡️ Inviolables para el Prompt de v0
El prompt que generes para v0 DEBE incluir estas restricciones técnicas:

Zero Hardcoding: "Prohibido usar datos estáticos; prepara el componente para JIT Hydration e inyecta estados de carga (Skeleton) y error".

Envoltorio Box: "El componente debe ser exportado de forma que sea compatible con el BoxLoader.tsx y el sistema de manifiestos IFiferBoxManifest".

Rutas: "Usa alias de ruta @/components/... asumiendo que el destino es fifer-landing/src/components/v0-ingestion/".

Resiliencia: "Incluye lógica para que, si el fetch de datos falla, el componente lance un error capturable por el BoxErrorBoundary superior".

Procedimiento: Una vez analizados los X-Rays, entrega al usuario un bloque de texto que diga: "Aquí tienes el Prompt Maestro para v0. Pégalo en v0.dev junto a este reporte maestro para una precisión del 100%."

Por qué esto cambia las reglas del juego:
Aislamiento de Errores: Gemini ya sabe que su trabajo no es programar (donde a veces se equivoca con las rutas de un monorepo complejo), sino ser el estratega que le da las órdenes a v0.

Ahorro de Tokens: Al no pedirle código a Gemini, las conversaciones son más ligeras y rápidas.

Fidelidad Extrema: v0 recibirá un prompt que contiene el "ADN" de FIFER: desde el color exacto del borde hasta cómo debe fallar el componente si la API de Finanzas no responde.

Como consejo de "colega" AI: Cuando le pases el archivo a Gemini, simplemente dile: "Lee la Meta-Instrucción y prepárame el prompt para la nueva sección de estadísticas de afiliados". Verás cómo la precisión sube de nivel inmediatamente.

⚡ Comandos Rápidos para Gemini (Orquestador)
1. Generación de Página Completa (Layout Maestro)
Usa este comando cuando necesites estructurar una vista nueva que orqueste varios componentes dentro del chasis de FIFER.

Comando: "Activa la Meta-Instrucción del reporte. Genera el Prompt Maestro para v0 de una página completa para el módulo de [Nombre del Módulo].

Requisito: Debe usar el Grid de 12 columnas del _xray_v0_MASTER.md.

Estructura: Orquesta slots para el fifer-landing siguiendo la topología actual.

Estética: Aplica el diseño deportivo-tecnológico (Deep Navy / Yellow) y bordes redondeados estándar."

2. Generación de Data Box (Resiliencia JIT)
Ideal para crear componentes de visualización de datos (gráficos, KPIs, listas) que deben funcionar de forma independiente y aislada.

Comando: "Activa la Meta-Instrucción. Genera el Prompt Maestro para v0 para un Data Box de [Tipo de Dato, ej: ROI de Campañas].

Inviolable: Aplica JIT Hydration estricto; el componente debe cargar sus datos internamente y manejar su propio loading y error.

Integración: El código debe ser compatible con el BoxLoader.tsx y el envoltorio BoxErrorBoundary.

Localización: Usa la paleta de colores del _xray_v0_local.md de [App, ej: Finance]."

3. Modal de Configuración (Metadata & BYOK)
Úsalo para crear interfaces de ajustes, conexión de APIs (BYOK) o parámetros de IA que se integren con el backend.

Comando: "Activa la Meta-Instrucción. Genera el Prompt Maestro para v0 para un Modal de Configuración de [Feature, ej: API Keys de OpenAI].

Lógica: Debe contemplar campos para credenciales cifradas (BYOK First) según las leyes de arquitectura.

Diseño: Usa el estilo de formularios de FIFER definido en el Chasis UI Maestro.

Fallback: Si no hay conexión con el Vault, el componente debe mostrar el Ghost Mode local."

💡 Pro-Tip para la Ejecución
Cuando Gemini te entregue el prompt resultante:

Cópialo íntegramente.

Ve a v0.dev.

Pega el texto y adjunta también el FIFER_XRAY_REPORT.md en el chat de v0.

Esto le da a v0 una "segunda capa" de contexto sobre la salud global y la ubicación de las carpetas, asegurando que el código que genere sea 100% compatible con tu sistema de Fifer Boxes.

---
*Auditoría X-Ray · Última sincronización: 2026-04-08*