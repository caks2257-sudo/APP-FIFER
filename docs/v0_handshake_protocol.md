# FIFER — Protocolo de “Handshake” v0 → Cursor

> **Audiencia:** generadores de UI (**v0**) y **Cursor** al integrar artefactos en el monorepo.  
> **Objetivo:** cada entrega desde v0 incluye, además del `.tsx`, un **Mini X-Ray** embebido o en bloque separado, para que Cursor sepa **cómo hidratar** el Box sin adivinar contratos.

**Leyes superiores (obligatorias):** [`_xray_v0_MASTER.md`](../_xray_v0_MASTER.md) · [`_xray_PROTOCOL_SHELL.md`](../_xray_PROTOCOL_SHELL.md) · [`docs/styleguide.md`](./styleguide.md).

**Frontend productivo:** solo **`fifer-landing/src/app/`** (Next.js). Los Boxes viven en **`fifer-landing/src/components/v0-ingestion/`**.

---

## 1. Qué debe entregar v0 en cada componente

1. **Un archivo** `*.tsx` (un Box = un archivo, Tailwind en `className`, sin CSS Modules ni styled-components salvo excepción de proyecto).
2. **Un bloque “Mini X-Ray”** (sección §3) en el mismo mensaje o pegado bajo el código: metadatos de entrega, no código ejecutable.

Cursor usará el Mini X-Ray para: registrar `boxId`, cablear `registry.ts`, adaptadores y puntos de datos.

---

## 2. ID del componente (`boxId`)

| Regla | Detalle |
|-------|---------|
| Formato | `kebab-case`, prefijo recomendado `fifer-` o dominio claro (`finance-*`, `content-*`, `affiliate-*`). |
| Unicidad | Debe coincidir con la clave en `fifer-landing/src/registry/box-catalog.ts` y con `V0_BOX_LOADERS` en `fifer-landing/src/components/v0-ingestion/registry.ts`. |
| Manifiesto | Mismo valor en `IFiferBoxManifest.boxId` (`fifer-landing/src/types/fifer-box.ts`). |

**Ejemplo:** `fifer-finance-snapshot`, `fifer-content-pipeline`.

---

## 3. Plantilla Mini X-Ray (copiar y rellenar)

v0 debe completar este bloque **siempre** al finalizar un Box:

```yaml
# MINI X-RAY — entrega v0
boxId: "<kebab-case-id>"
sourceModule: "<finance|content|affiliates|dashboard|...>"
targetSlot: "<slot-main|slot-hero|...>"
variantDefault: "<Mini|Standard|Hero>"
capabilities:
  hasAIChat: true|false
  isDraggable: true|false
layoutManifest:
  minWidth: <1-12>   # columnas grid
  minHeight: <1-6>   # filas lógicas
dataContract:
  summary: "<qué representa data>"
  fields:
    - name: "<campo>"
      type: "<string|number|array|object>"
      required: true|false
configContract:
  usesSDUI: true|false
  configTypes: "<table|chart|form|none>"
themeNotes: "<opcional: acentos locales según _xray_v0_local del módulo>"
hydration:
  primary: "<jit-landing|fifer-content|motor-src|api-master>"
  notes: "<dónde vive el fetch o el script; ver §5>"
```

---

## 4. Estructura de `data` y `config` esperada

### 4.1 Superficie TypeScript (`BoxProps`)

Referencia: `fifer-landing/src/types/fifer-box.ts`.

| Campo | Uso |
|-------|-----|
| `data` | Payload de negocio. Tipar en comentario JSDoc o interfaz exportada junto al Box. Preferir formas **serializables** (JSON-friendly). |
| `config` | SDUI opcional: tablas, gráficos, formularios (`fifer-landing/src/types/ui-schema.ts` → `BoxUIConfig`). |
| `isLoading` / `error` | El shell puede inyectarlos; el Box debe degradar sin crashear. |
| `isLocked` | BYOK / permisos; overlay o estado vacío según producto. |

### 4.2 Normalización

Si la API no coincide 1:1 con el Box, documentar en el Mini X-Ray y usar / extender:

- `fifer-landing/src/utils/adapters.ts` (`adaptFinanceApiToBoxData`, `adaptAffiliatesToBoxData`, etc.).

### 4.3 Manifiesto de layout (`IFiferBoxManifest`)

- `layout.minWidth` / `layout.minHeight` alinean el **grid de 12 columnas** con el Living OS (`useLayoutStore`).
- `targetSlot` debe existir en la ruta del módulo (`fifer-landing/src/modules/<modulo>/module.config.ts`).

---

## 5. Variantes visuales (Mini · Standard · Hero)

Definición operativa: `fifer-landing/src/registry/box-catalog.ts` (`BoxVariant`).

| Variante | Grid orientativo | Comportamiento UI |
|----------|------------------|-------------------|
| **Mini** | ~`col-span-3`–`4` | Denso: menos padding, tipografía `text-sm`, una métrica o lista corta. |
| **Standard** | ~`col-span-4`–`6` | Densidad por defecto; jerarquía legible (`p-3`/`p-4`). |
| **Hero** | ~`col-span-12` | Impacto: KPIs grandes, gráfico principal o tabla ancha; más aire vertical. En runtime puede coincidir con expansión “Hero” del layout. |

El Box debe **responder** al espacio del slot sin anchos fijos en px que rompan `col-span-*`.

---

## 6. Guía de hidratación (dónde conectar servicios)

Cursor debe usar esta tabla para decidir **dónde** vive el fetch o el proceso, **sin** duplicar lógica de negocio.

| Origen | Ruta / rol | Cuándo usar |
|--------|------------|-------------|
| **JIT en landing (browser)** | `fifer-landing/src/lib/fifer-api.ts`, módulos `fifer-landing/src/modules/*/services/` | Datos del **API master** expuestos al panel; sesión Supabase según `_xray_v0_local` de landing. |
| **Motor monorepo (`src/`)** | Servicios Node, finanzas, ledger, integraciones | Lógica **servidor** o jobs; el Box **no** importa módulos Node directamente: expone contratos vía API que consume el landing. |
| **fifer-content** | Scripts/orquestadores de generación editorial (fuera del árbol Next) | **Generación** de contenido, pipelines batch; el Mini X-Ray debe indicar **qué endpoint o job** alimenta datos que terminarán en `data` vía API. |
| **Adaptadores** | `fifer-landing/src/utils/adapters.ts` | Unificar formas heterogéneas (Finanzas, Shopify, Afiliados) al payload del Box. |

**Reglas:**

1. **Un Box v0** no debe contener `fetch` interno salvo instrucción explícita de arquitectura; lo habitual es hidratar desde el padre/orquestador o capa de datos del módulo.
2. Tras pegar el componente, Cursor debe: añadir entrada en **`registry.ts`**, **`box-catalog.ts`**, y opcionalmente manifiesto JSON / `module.config.ts` (slots).
3. Cualquier servicio nuevo documenta su **contrato** en el Mini X-Ray (`hydration.notes`).

---

## 7. Checklist de integración (Cursor)

- [ ] `boxId` único y registrado en `registry.ts` + `box-catalog.ts`.
- [ ] Props cumplen `BoxProps`; `config` tipado si hay SDUI.
- [ ] Mini X-Ray completo (§3) pegado en PR o comentario de issue.
- [ ] Variante y `layout` coherentes con grid 12.
- [ ] Hidratación alineada con §6 (sin imports prohibidos desde el Box).

---

## 8. Referencias rápidas

| Recurso | Ruta |
|---------|------|
| Contrato Box / manifiesto | `fifer-landing/src/types/fifer-box.ts` |
| SDUI | `fifer-landing/src/types/ui-schema.ts` |
| Catálogo | `fifer-landing/src/registry/box-catalog.ts` |
| Registro JIT | `fifer-landing/src/components/v0-ingestion/registry.ts` |
| Shell | `fifer-landing/src/components/core/BoxLoader.tsx` |
| Mapa monorepo | `FIFER_XRAY_REPORT.md` |

---

*Documento de handshake: v0 genera el artefacto + Mini X-Ray; Cursor integra en el chasis FIFER sin romper el protocolo Box.*
