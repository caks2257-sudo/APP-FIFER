# 🎨 X-Ray UI local — saas-fifer (ecosistema legacy / servicios)

> **App:** `saas-fifer` — scripts Node, módulos `fifer-platform`, gateway y **core-service** FastAPI; **sin** aplicación Next/React en este árbol.  
> **Chasis global:** [`_xray_v0_MASTER.md`](../_xray_v0_MASTER.md) (raíz monorepo).  
> **Torre de control:** [`FIFER_XRAY_REPORT.md`](../FIFER_XRAY_REPORT.md).

---

## Identidad visual

| Enfoque | Detalle |
|---------|---------|
| **UI web** | **No aplica** en este paquete: no hay `components/` React ni Tailwind aquí. Cualquier UI nueva debe seguir el **Navy / Golden Yellow / Electric Blue** del [`_xray_v0_MASTER.md`](../_xray_v0_MASTER.md) y del landing en `fifer-landing/`. |
| **Tokens propios (runtime)** | Servicios Python/Node usan estética **neutra** (health JSON, logs). Módulos de negocio (`app-marketing`, plays JSON) describen tono de campaña en datos, no en CSS. |
| **Herencia de marca** | **Conceptual:** al documentar o exponer mensajes hacia usuario final, alinear copy con FIFER (amarillo `#EAB308`, navy oscuro). **Técnico:** la identidad “visual” vive en `fifer-landing`; este repo es **backend/scripts**. |

---

## 📂 Estructura y Árbol del Módulo

Árbol resumido (archivos y carpetas clave; relativo a `saas-fifer/`):

```text
saas-fifer/
├── package.json                 # Deps Node (axios, puppeteer, cheerio, …)
├── package-lock.json
├── ping.js                      # Smoke check mínimo
├── config/
│   └── index.js                 # Carga dotenv: DB, Supabase, IA, afiliados, social
├── services/
│   ├── aiService.js
│   ├── clickbankService.js
│   ├── dbService.js
│   └── shareasaleService.js
├── modules/
│   └── fifer-platform/
│       ├── index.js             # Export kit: featureFlags, tagCenter, scoring, credits, appMarketing
│       ├── featureFlags.js
│       ├── tag-center/
│       │   └── tagRepository.js
│       ├── scoring/             # scoringEngine.js, DSL/schema YAML+JSON ejemplos
│       ├── credits/             # creditSimulator.js, engine-rates example
│       ├── app-marketing/       # plays, templates JSON, playLoader, affiliateBridge, index
│       ├── schemas/             # tag.def.json
│       └── examples/            # tag.example.json
├── scripts/                     # CLI / cron-friendly (sync, tests, adapters, sellers)
│   ├── adapters/
│   ├── sellers/                 # aliexpress, Alibaba, Govee, sync_aliexpress
│   ├── xray_admitad.js, xray_products.js, fetch_products.js, …
│   └── …
├── gateway/
│   ├── main.py                  # FastAPI mínimo “FIFER Gateway”
│   └── requirements.txt
├── ecosystem/
│   ├── core-service/            # FastAPI “Core Service” (auth, voices, models, schemas)
│   │   └── app/
│   │       ├── main.py
│   │       ├── api/v1/          # auth.py, voices.py
│   │       ├── models/, schemas/
│   │       └── init_db.py
│   ├── gateway/
│   │   └── requirements.txt
│   └── infra/
│       └── docker-compose.yml
├── .github/
│   └── workflows/
│       └── fifer_cron.yml
└── _xray_v0_local.md            # (este archivo)
```

---

## Inventario de Componentes / Lógica

| Carpeta / archivo | Función |
|--------------------|---------|
| **`config/index.js`** | Centraliza variables de entorno: Postgres/Supabase, claves IA (Gemini, OpenAI, Anthropic, Groq), media, redes, **afiliados** (Amazon, Impact, ClickBank, ShareASale, etc.). |
| **`services/`** | Integraciones de alto nivel: DB, ClickBank, ShareASale, orquestación IA (`aiService.js`). |
| **`modules/fifer-platform/`** | Kit compartido: **tag center**, motor de **scoring**, simulador de **créditos**, **app-marketing** (carga de plays, bridge afiliados, plantillas JSON). |
| **`modules/fifer-platform/app-marketing/plays/templates/`** | Definiciones de “plays” de campaña (high commission, viral growth, etc.). |
| **`scripts/`** | Herramientas operativas: sync catálogos, pruebas de redes afiliadas, listados de modelos, diagnósticos, adapters hacia tag center. |
| **`gateway/main.py`** | API FastAPI ligera: health `GET /api/v1/health`. |
| **`ecosystem/core-service/`** | Servicio FastAPI con routers **auth** y **voices** bajo `/api/v1/core/*`, modelos usuario, init DB. |
| **`ecosystem/infra/docker-compose.yml`** | Orquestación local de servicios del ecosistema. |
| **`.github/workflows/fifer_cron.yml`** | Automatización tipo cron en GitHub Actions. |

---

## Contrato de datos

| Origen / destino | Descripción |
|------------------|-------------|
| **Motor central `src/` (Node)** | **No hay imports directos** desde este paquete hacia `../src` en el código escaneado. Conviven como **líneas paralelas** en el monorepo; integración operativa va por **mismas convenciones** (Supabase, variables de entorno) cuando se despliega junto al resto. |
| **Supabase / Postgres** | `config/index.js` usa `SUPABASE_*` y `DATABASE_URL` — mismo plano de datos que puede consumir el motor principal si comparten proyecto. |
| **APIs externas** | Afiliados (Amazon, ClickBank, ShareASale, …), proveedores IA y media según env. |
| **APIs expuestas aquí** | **Python:** `gateway` (`/api/v1/health`), `core-service` (`/api/v1/core/auth/*`, `/api/v1/core/...`, voices). **Node:** sin servidor HTTP unificado en el árbol; scripts invocados por CLI/cron. |
| **JIT (hidratación browser)** | **No aplica:** no hay Boxes ni React; el JIT documentado vive en **`fifer-landing`**. |

---

## Estado

| Aspecto | Estado |
|---------|--------|
| **Paquete en monorepo** | **Operativo como código legacy / laboratorio** — scripts y servicios Python útiles para ingestión, plays y pruebas; **no** es el frontend ni el API master único de producción (`fifer-landing` + `src/server.js`). |
| **Documentación** | **En desarrollo** — este X-Ray debe actualizarse al añadir rutas FastAPI nuevas o mover lógica al motor central. |

---

## Estado (checklist)

- [ ] Sincronizar tras cambios en `ecosystem/core-service` o en scripts críticos de afiliados.
