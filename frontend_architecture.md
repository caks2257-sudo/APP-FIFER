# Arquitectura frontend — Mapa modular (Next.js)

Vista orientada a un **sistema modular tipo microfrontend**: cada unidad funcional vive en un lugar predecible, con límites claros entre **routing**, **features (boxes)**, **UI compartida** y **infraestructura**.

Convención: rutas desde la raíz del paquete frontend (p. ej. `fifer-landing/` o el workspace que corresponda).

---

## `/app`

**App Router de Next.js.**

- `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` según necesidad.
- **Solo orquestación**: composición de layouts, metadata, providers mínimos, y ensamblaje de boxes o páginas.
- No alojar lógica de negocio pesada ni implementaciones largas de features; delegar en `/boxes` o `/lib`.

---

## `/boxes`

**Unidades “microfrontend” autocontenidas** (Smart Boxes).

- Una carpeta por box: `boxes/<nombre-box>/` con componentes, lógica de feature y, si aplica, un `index` que exporta la box pública.
- Cada box consume el **SmartBoxShell** (ver `box_system.md`) y respeta `SmartBoxProps`.
- Evitar dependencias circulares entre boxes; factor común → `/components` o `/lib`.

---

## `/components`

**Componentes de UI reutilizables** no ligados a una sola feature.

- Primitivos, layouts genéricos, cards, form controls compartidos.
- No incluir aquí el “cuerpo” completo de una feature que debería vivir en `/boxes`.

---

## `/config`

**Configuración estática y tipada.**

- Feature flags de cliente (si aplica), rutas nombradas, límites, textos de marca centralizados cuando no vengan de CMS.
- Sin secretos: variables sensibles solo vía env del servidor (`process.env` en Server Components / route handlers), nunca valores embebidos en bundles públicos.

---

## `/mock-data`

**Datos de desarrollo, Storybook, tests y demos.**

- Fixtures JSON/TS que imitan APIs para desarrollo local o pruebas.
- No usar como fuente de producción; sustituir por fetch/API real en integración.

---

## `/hooks`

**Hooks React compartidos** (`use*`).

- Estado de UI transversal, media queries, debounce, sincronización con URL, etc.
- Hooks específicos de una sola box pueden vivir dentro de `boxes/<nombre>/hooks` si no se reutilizan.

---

## `/lib`

**Utilidades puras y clientes de infraestructura.**

- Helpers de fecha/string, validación, formateo, `fetch` envueltos, errores tipados.
- **No** componentes React aquí (salvo excepciones muy justificadas como factories); mantener `/components` para UI.

---

## `/types`

**Tipos TypeScript compartidos** entre capas.

- Contratos de API, DTOs compartidos, unions de estado globales, extensiones de tipos de librerías.
- Tipos que solo usa una box pueden colocalizarse en esa box; promover a `/types` cuando haya dos consumidores o más.

---

## Flujo de dependencias (resumen)

```
/app        → compone layouts y ensambla boxes
/boxes      → features con SmartBoxShell + contrato estable
/components → UI reutilizable
/lib + /hooks + /types + /config → soporte tipado y DRY
/mock-data  → solo dev/test/demos
```

---

## Coherencia con el protocolo AI

- **v0**: prototipos visuales que luego se integran bajo `/boxes` y `/components` según este mapa.
- **Cursor Chat**: cambios localizados respetando estos límites de carpeta.
- **Cursor Agent**: nuevas rutas, nuevas boxes, hooks y tipos compartidos siguiendo exactamente esta estructura.
