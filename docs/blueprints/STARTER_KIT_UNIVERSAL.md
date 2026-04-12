# Starter Kit universal — FIFER (App + Engine)

Plantilla normativa para cualquier pieza nueva del ecosistema: **TIPO: APP** (UI / Next.js bajo dashboard) o **TIPO: ENGINE** (lógica pura, APIs, sin interfaz de producto). El scaffolding (`npm run fifer:create-app` u homólogo para motores) debe materializar la estructura sin omitir elementos obligatorios.

Ambos tipos **heredan el mismo ADN de trazabilidad**: `mainApp`, `subApp` (opcional), `ownerId` (y `metadata` opcional en entidades persistidas), alineado con `prisma/schema.prisma` y `.cursorrules` (trazabilidad universal).

**Arquitectura Hub & Spoke:** Toda App de producto es un **Hub** (segmento raíz en `(dashboard)` + registro). Los **Spokes** son Sub-Apps anidadas (tipo GPS `SUB_APP`) que comparten el mismo `mainApp` y refinan `subApp` en datos y rutas. Los espejos globales `prisma/_xray_DATABASE_GLOBAL.md` y `docs/blueprints/_xray_UI_GLOBAL.md` definen esta jerarquía; la **Ley de Sincronización Retroactiva** (`.cursorrules` §11) obliga a que cualquier cambio de ADN se propague a Apps y motores existentes y al Starter Kit.

**Motores:** Toda función nueva o cambio sustancial se modela como Engine o Sub-Engine intercomunicados (§5.8–5.9 de `.cursorrules`), con X-Ray y `sync:gps`. Ver `docs/blueprints/AUTO_HEALING_COMPLIANCE.md` para GPS + compliance.

---

## 0. Matriz de tipos

| Aspecto | TIPO: APP | TIPO: ENGINE |
|--------|-----------|----------------|
| **Rol** | Experiencia de usuario, rutas, Boxes, Sidebar | Contratos de entrada/salida, orquestación, llamadas a APIs externas |
| **Ubicación típica** | `src/app/[locale]/(dashboard)/<slug>/` (i18n: diccionarios en `messages/es-CL.json` y `messages/en-US.json`; motor `next-intl` en `src/i18n/`) | `src/engines/<nombre>/` (sub-motores: `.../sub-engines/<hijo>/`) |
| **Planos X-Ray** | `_xray_UI`, `_xray_DATA`, `_xray_ROUTING`, `_xray_HEALING`, `_xray_DATABASE` | `_xray_CONTRACT`, `_xray_LOGIC`, `_xray_HEALING`, `_xray_DATABASE` |
| **Registro** | `src/registry/app-registry.ts` | `EngineRegistry` (convención del monorepo) |
| **Comunicación con otros motores** | Solo vía HTTP/fetch interno o bus acordado, **con** `InternalApiKey` válida documentada en `_xray_INTERNAL_COMMUNICATIONS.md` | Expone contrato; valida caller según política de llaves |
| **ADN en datos** | `mainApp` = slug del **Hub**; `subApp` opcional por **Spoke** | `mainApp` / `subApp` en registros que persista el motor (mismo significado fractal) |
| **Hub / Spoke** | Hub = carpeta raíz `<slug>/` + `app-registry`; Spokes = rutas anidadas + planos `_xray_*` | N/A en carpeta `engines/` (motores usan `FIFER://` y contratos; jerarquía fractal `sub-engines/`) |

### 0.1 External Bridge (`external-bridge-engine` — §12 + §14 Macro-Pilares + §15 `.env`)

- **Patrón:** paquete `packages/engines/external-bridge-engine/` + registro en `src/engines/external-bridge-engine/`; proxy central `BridgeProxy` y adaptadores Payments / Billing / Banking; MOCK automático si la clave es `INSERT_KEY_HERE` o falta (**Mock-First**).
- **Macro-Pilares:** cada entrada en `BRIDGE_ENV_BINDINGS` lleva `category` en `BridgeConnectionCategory`: `INTELIGENCIA_ARTIFICIAL` | `FINANZAS_PAGOS` | `ECOMMERCE` | `INFRAESTRUCTURA` | `REDES_SOCIALES` (constante `BRIDGE_MACRO_PILLARS`). Las Apps nuevas leen `integrations[].category` desde `useExternalBridge` / `GET /api/v1/external-bridge/status` y el hub (`ExternalConnectionsPanel`) agrupa por estos cinco pilares por defecto.
- **Apps nuevas:** el scaffolding (`npm run fifer:create-app`) incluye `useExternalBridge` en `page.tsx` (snapshot `v0_pack/templates/SNAPSHOT_useExternalBridge.md`).
- **Espejo:** `docs/blueprints/_xray_EXTERNAL_BRIDGE.md`; GPS del motor bajo `src/engines/external-bridge-engine/_blueprints/`.
- **`.env` local:** solo el Sub-Engine `system-engine:env-manager` (`NODE_ENV=development`); orden por bloques §15 documentado en `.cursorrules` y en el X-Ray External Bridge.

### 0.2 Facturación Chile / Bridge (`finance-engine:billing` + IVA)

- **IVA por defecto:** 19% en líneas afectas (mapeo OpenFactura-compatible en `src/engines/finance-engine/sub-engines/billing/openfactura-mapper.ts`).
- **DTE:** campos `dteFolio`, `dtePdfUrl`, `dteStatus` en `Transaction`; emisión vía `EngineRegistry.use('external-bridge-engine').emitInvoice` (adaptador billing).
- **Trigger:** al completar cobro `payment_checkout`, el webhook dispara facturación automática (ver `docs/blueprints/_xray_EXTERNAL_BRIDGE.md`).
- Snapshot: `v0_pack/templates/SNAPSHOT_BILLING_IVA.md`.

### 0.3 Motores de pronóstico analítico (`forecast-core`)

- **Patrón:** motor padre bajo `src/engines/forecast-core/` con sub-motores en `sub-engines/<nombre>/` (IDs `forecast-core:<nombre>` en `EngineRegistry`).
- **Contratos:** Zod de entrada/salida en `sub-engines/<nombre>/schemas.ts`; planos `_xray_CONTRACT` / `_xray_LOGIC` / `_xray_HEALING` / `_xray_DATABASE` obligatorios.
- **Consumo desde API Next:** import del barrel `import '@/engines/forecast-core'` en la ruta y llamada **in-process** a `EngineRegistry.use('forecast-core:…')`. Si en una fase no se usa `InternalApiKey`, la excepción debe constar en `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`.
- **Registro visible en health:** el motor `forecast-core` se importa desde `src/engines/system-health/index.ts` para que las sondas que listan IDs críticos vean el sub-motor montado sin depender de que el usuario haya llamado antes a una ruta de Finanzas.

### 0.4 Internacionalización (i18n)

- **Diccionarios:** `messages/es-CL.json` y `messages/en-US.json` (namespaces por App, p. ej. `finanzas`, `dom`). No hard-codear copy en componentes (`.cursorrules` §13).
- **Rutas:** Apps de producto bajo `src/app/[locale]/(dashboard)/<slug>/`; `Link` / `useRouter` / `redirect` desde `@/i18n/navigation`.
- **Mapa global:** `docs/blueprints/_xray_I18N.md` (GPS + convenciones de namespaces).

---

## 1. ADN de persistencia (Prisma)

Toda entidad creada por usuario debe llevar trazabilidad **ownerId** + **mainApp** (+ **subApp** opcional) + **metadata** opcional (`Json`), salvo tablas de sistema explícitas documentadas en `_xray_DATABASE.md`.

### Bloque estándar (modelo de referencia)

```prisma
// Ejemplo: modelo de dominio — mantener convención de tipos del monorepo
model ExampleEntity {
  id        String   @id @default(cuid())
  // ... campos de negocio ...

  mainApp   String   @default("nombre-de-tu-app") // app cabecera (ej. misbots, contratos, dom)
  subApp    String?  // sub-módulo o ruta lógica (ej. recepcion, permisos)
  metadata  Json?    // payload extensible (JSONB en Postgres)
  ownerId   String

  owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@index([mainApp])
}
```

**Reglas:**

- **mainApp:** aplicación FIFER de primer nivel que originó el registro (tanto en Apps como en datos producidos por Engines).
- **subApp:** opcional; refina el contexto dentro de la misma `mainApp`.
- **metadata:** JSON arbitrario versionado por convención de negocio; documentar claves en `_xray_DATA.md` o `_xray_CONTRACT.md`.
- **ownerId:** siempre FK a `User.id` para filas multi-tenant (salvo tablas de sistema explícitas).

### Llaves internas (App ↔ Engine)

El modelo `InternalApiKey` en `prisma/schema.prisma` gobierna qué identidad (`ownerId`) puede usar una llave con qué destino (`targetAppOrEngine`) y con qué `scope`. Toda relación caller → motor debe estar reflejada en `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`.

---

## 2. Estructura de carpetas obligatoria

### TIPO: APP (dashboard)

```
src/app/(dashboard)/<slug-de-la-app>/
  page.tsx                    # o layout + segmentos hijos
  _blueprints/
    _xray_UI.md
    _xray_DATA.md
    _xray_ROUTING.md
    _xray_HEALING.md
    _xray_DATABASE.md         # obligatorio — Espejo técnico 1:1 (ver §3)
```

### TIPO: ENGINE

```
src/engines/<nombre-motor>/
  ... código del motor ...
  _blueprints/
    _xray_CONTRACT.md
    _xray_LOGIC.md
    _xray_HEALING.md
    _xray_DATABASE.md         # obligatorio — N/A + enlace al esquema compartido, o modelo propio
```

### Sub-engine (fractal)

```
src/engines/<padre>/sub-engines/<hijo>/
  _blueprints/
    (mismo conjunto que el motor, incluido _xray_DATABASE.md)
```

---

## 3. `_xray_DATABASE.md` (Espejo técnico)

Debe ser un **espejo 1:1** del diccionario de datos respecto a `prisma/schema.prisma` para las tablas que la App o el motor tocan (o el esquema compartido si no hay tablas propias).

Cada plano debe incluir, como mínimo:

1. **Tablas** (nombre SQL / modelo Prisma).
2. **Columnas** con tipo Prisma y tipo SQL equivalente.
3. **PK, FK, `onDelete`.**
4. **Índices** (`@@index`, `@@unique`).
5. **RLS** (estado y políticas objetivo en Supabase).
6. **Migraciones** relevantes (`supabase/migrations/`, `prisma migrate`).

Referencia viva del espejo global: `prisma/_xray_DATABASE_GLOBAL.md`.  
Comunicaciones App ↔ Engine: `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`.

### 3.1 Ancla lógica obligatoria (GPS)

En **al menos un** plano del módulo (habitualmente `_xray_DATABASE.md` o el plano que encabece el dominio), incluir siempre:

```markdown
## UBICACIÓN LÓGICA

`FIFER://<NAMESPACE>/<IDENTIFICADOR>`
```

Tras cambios de carpetas, ejecutar `npm run sync:gps` para regenerar `docs/registry/LOCATION_MAP.json`.

Opcional (solo si aplica a llaves internas): en el mismo archivo o en `_xray_COMMS.md`, documentar explícitamente:

```markdown
**targetAppOrEngine:** `slug-interno`
```

---

## 3 bis. Placeholders de Espejo (todas las categorías de X-ray)

Cualquier plano nuevo debe seguir el formato **Reflejo de código**: sustituir los comentarios entre corchetes por datos reales verificados en el repo. No dejar listas genéricas sin anclar a rutas, tipos o nombres concretos.

### Database (`_xray_DATABASE.md`)

- Ancla `## UBICACIÓN LÓGICA` + `` `FIFER://...` ``.
- Tabla de mapeo Prisma ↔ SQL; por cada modelo tocado: columnas, PK/FK, índices, RLS, migraciones (como en la sección 3 de este kit).

### Logic / Contract (motores: `_xray_LOGIC.md`, `_xray_CONTRACT.md`)

```markdown
## UBICACIÓN LÓGICA
`FIFER://...`

## Reflejo de código
| Entrada (Zod / tipo) | Origen en código |
| Salida (Zod / tipo) | Handler / función |
| Efectos secundarios | APIs externas, DB, colas |
```

### UI (`_xray_UI.md`)

Cada App o motor con superficie visual debe mantener un plano **`_xray_UI.md`** que cumpla el **estándar X-RAY UI** (Fase 24 — vistas dinámicas y acoplamiento fluido). Por cada **vista o panel de datos** relevante, el plano debe incluir al menos una fila con:

| Campo | Contenido esperado |
|-------|---------------------|
| **Componente** | Nombre del componente React y ruta de archivo. |
| **Origen de datos** | Endpoint HTTP y/o forma del payload (tipos / claves). |
| **Vista preferida** | p. ej. BarChart, lista, mapa de calor. |
| **Vista fallback** | Lista plana o tabla raw ante error o datos incompatibles. |
| **Opciones de visualización** | Conmutadores permitidos (ej. barras / líneas / torta) y qué requiere integración v0. |

Plantilla mínima por vista:

```markdown
| Componente | Origen de datos (endpoint / payload) | Vista preferida | Vista fallback | Opciones de visualización |
|------------|--------------------------------------|-----------------|----------------|---------------------------|
| `MiPanel` | `GET /api/v1/...` · `{ items: [...] }` | LineChart | Tabla raw | barras · líneas (v0) |
```

Además del bloque normativo anterior:

```markdown
## UBICACIÓN LÓGICA
`FIFER://...`

## Reflejo de código
| Pantalla / ruta | Archivo(s) TSX |
| Componentes clave | Imports desde v0_pack/ o src/components/ |
| Grid / tokens | Convenciones Tailwind del módulo |
```

**Reglas de layout (ADN §19):** en grids de paneles, preferir `items-start` o columnas con `break-inside-avoid` para evitar stretch vertical no deseado entre cajas de distinta altura.

### Routing (`_xray_ROUTING.md`)

```markdown
## UBICACIÓN LÓGICA
`FIFER://...`

## Reflejo de código
| URL | segmento app | page.tsx / layout |
| Sidebar | entrada en app-registry.ts |
```

### Healing (`_xray_HEALING.md`)

```markdown
## UBICACIÓN LÓGICA
`FIFER://...`

## Reflejo de código
| Box / boundary | Archivo | umbral / circuit breaker |
| Ghost mode | condición y fallback |
```

### Comms (`_xray_COMMS.md` o sección en plano de motor)

```markdown
## UBICACIÓN LÓGICA
`FIFER://...`

## Reflejo de código
| Llamada interna | Ruta API o helper | InternalApiKey / scope |
| Documentación cruzada | docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md |
```

### Location (si se añade un plano dedicado `_xray_LOCATION.md`)

```markdown
## UBICACIÓN LÓGICA
`FIFER://...`

## Reflejo de código
| Ancla FIFER | Ruta física del módulo (tras último sync:gps) |
| Tipo GPS | APP | SUB_APP | ENGINE | SUB_ENGINE |
```

**Norma:** si nace una categoría nueva de X-ray, debe incluir la misma pareja **Ancla + bloque «Reflejo de código»** con tablas enlazadas a artefactos reales; el GPS solo indexa anclas presentes bajo `_blueprints/`.

---

## 4. Registro en el ecosistema

- **Apps:** entrada en `src/registry/app-registry.ts`.
- **Engines:** registro en `EngineRegistry` según convención del monorepo.
- Tras cambios estructurales: `npm run v0-sync` (o script equivalente) para `v0_pack/`.

---

## 5. Integración Supabase / código

- Cliente de aplicación: **Prisma** centralizado; no SQL ad hoc en features.
- Inserciones vía **Supabase JS** donde aplique: tipos en `src/types/supabase-database.ts` deben coincidir con columnas reales (`mainApp`, `subApp`, `metadata`).

---

**Fuentes normativas:** `.cursorrules` (§5 motores, §8 persistencia, §10 GPS, §11 Ley de Sincronización Retroactiva), `prisma/schema.prisma`, `prisma/_xray_DATABASE_GLOBAL.md`, `docs/blueprints/_xray_UI_GLOBAL.md`, `docs/blueprints/AUTO_HEALING_COMPLIANCE.md`, `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`.
