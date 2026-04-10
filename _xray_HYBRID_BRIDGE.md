# 🌉 FIFER — Hybrid Bridge (manual para IAs externas: v0 + Lovable)

> **Audiencia:** v0.dev, Lovable, Lovable↔GitHub, y cualquier IA generadora de UI/código para FIFER.  
> **Cursor:** usa este archivo como **manual de instrucciones** al armar prompts; fusiona con **`_xray_v0_MASTER.md`**, **`_xray_v0_local.md`** de la app activa y **`.cursorrules` §9** (modos LOVABLE / v0).  
> **Contrato técnico:** `src/types/fifer-box.ts` · **Orquestador:** `fifer-landing/src/components/core/BoxLoader.tsx`.

---

## ✍️ USER CUSTOM INSTRUCTIONS (PASTE HERE)

<!-- Pega aquí ideas, copy, referencias visuales o alcance antes de pedir a Cursor que genere el prompt para la IA externa. -->

*(Vacío = Cursor inferirá solo ADN global + X-Ray local de la app en curso.)*

**Instrucción para Cursor:** Al generar el prompt para v0 o el briefing para Lovable, **prioriza** el texto pegado en esta sección como motor creativo, **filtrado** por la paleta y slots del **`_xray_v0_local.md`** correspondiente y por las leyes del **§1** de este documento. Incluye siempre recordatorio de **Fifer Boxes** (sin hardcodear datos de negocio).

---

## 1. ADN visual de FIFER (global)

| Pilar | Especificación |
|--------|----------------|
| **Estilo** | Minimalista, moderno, **deportivo-tecnológico**; alto contraste; ritmo claro. |
| **Paleta global** | **Deep Navy** `#0A0F1E` (fondos, shell). **Electric Blue** `#2563EB` (informativo, CTAs secundarios). **Golden Yellow** `#EAB308` (`fifer-yellow`, acentos marca). Superficies zinc `#18181B`–`#09090B`. |
| **Tipografía** | **Montserrat** (o sans bold) para títulos; **Open Sans** / **Source Sans 3** para cuerpo y UI. |
| **Leyes de diseño** | Tema **oscuro** por defecto; **grid 12 columnas** para el lienzo; **sin** `position: absolute` para fijar slots de Box; jerarquía tipográfica explícita; componentes tolerantes de **Ghost** (blur/overlay). |
| **Por app** | Colores de marca por dominio (finanzas, contenido, etc.) en **`[app]/_xray_v0_local.md`** y opcionalmente en **`manifest.themeOverrides`**. |

---

## 2. Contrato de Fifer Boxes (reconocimiento por `BoxLoader`)

Los componentes que exporta una IA externa deben integrarse así:

1. **Manifiesto** (`IFiferBoxManifest` en TS o JSON): `boxId`, `sourceModule`, `targetSlot`, `layout`, `permissions`, `dataDependencies`, `fallbackStrategy`, opcional **`themeOverrides`** (hex → variables CSS `--fifer-box-*` en el contenedor). Ver `src/types/fifer-box.ts` y `fifer-landing/src/components/core/manifests/`.

2. **Envoltorio en runtime:**

   ```tsx
   <BoxLoader manifest={manifest} loading={…} dataLocked={…} hasValidByok={…} userRole={…}>
     <TuBox data={…} config={…} isLocked={…} />
   </BoxLoader>
   ```

3. **Props que el componente del Box debe exponer** (para que `BoxLoader` y el padre sean coherentes):

| Prop | Rol |
|------|-----|
| **`data`** | Payload desde API / hooks (`fifer-api`, etc.); puede ser `unknown`, null o vacío. **No** hardcodear datos de negocio reales. |
| **`config`** | Objeto pequeño **solo de presentación** (títulos, densidad, toggles UI). Sin duplicar reglas de negocio del backend. |
| **`isLocked`** | `true` cuando no hay clave, saldo o datos; el padre puede alinear con `dataLocked` / BYOK. El layout no debe romperse. |

4. **Sin `fetch` dentro del Box** salvo instrucción explícita del equipo; el padre inyecta datos.

---

## 3. Instrucciones v0 (Precision UI)

- **Alcance:** Componentes **React + TypeScript + Tailwind** aislados, un archivo o pieza clara.  
- **RSC primero:** Server Component por defecto; **`"use client"`** solo si hay estado, efectos o eventos que lo exijan.  
- **Tailwind en línea:** Solo `className` con utilidades Tailwind; **prohibido** CSS externo, CSS Modules o styled-components en el entregable v0.  
- **Autocontenido:** Preferir **un `.tsx`** por Box en `fifer-landing/src/components/v0-ingestion/`.  
- **Iconos:** `lucide-react` permitido si ya está en el proyecto.  
- **Modo Cursor:** **«MODO v0»** — Cursor actúa como **Integrador** (BoxLoader + manifiesto). Ver `.cursorrules` §8–§9.

---

## 4. Instrucciones Lovable (Full-stack / flujos)

- **Alcance:** **Arquitectura de carpetas** (`fifer-landing` App Router), **flujos completos**, **pulido visual masivo**, navegación entre rutas.  
- **Carpetas:** Respetar grupos `(marketing)`, `(dashboard)`, `app/api/*`; no romper rutas existentes sin migración explícita.  
- **Supabase:** Usar patrones del repo (`fifer-landing/src/lib/supabase.ts`, sesión para APIs); **no** eliminar hooks de auth ni flujos BYOK al refactorizar.  
- **Navegación:** Layouts compartidos (`AppShell`, sidebars); enlaces coherentes con el sistema de slots/Boxes donde aplique.  
- **Modo Cursor:** **«MODO LOVABLE»** — Cursor actúa como **Reviewer** de PRs desde GitHub: validar **Fifer Boxes**, **Financial Bunker** y **BYOK First** antes de sugerir merge. Ver `.cursorrules` §9.  
- **Protección:** Sin **«MODO LOVABLE»** o **«MODO v0»** explícitos, no alterar capa visual masiva de `fifer-landing` salvo orden contraria (`.cursorrules`).

---

## 5. Cadena de documentos (escaneo escalonado)

| Orden | Archivo | Uso |
|-------|---------|-----|
| 1 | **Este archivo** (`_xray_HYBRID_BRIDGE.md`) | Manual único para IAs externas + USER CUSTOM híbrido. |
| 2 | `_xray_v0_MASTER.md` | Chasis global (duplica parte de reglas; fuente si el bridge no basta). |
| 3 | `[app]/_xray_v0_local.md` | Paleta, slots y Ghost **de esa app**. |
| 4 | `_xray_frontend_v0_bridge.md` | Checklist y plantillas largas solo-v0. |
| 5 | `FIFER_XRAY_REPORT.md` | Torre de control y salud por módulo. |

---

## 6. Referencias rápidas

- **Torre de control:** `FIFER_XRAY_REPORT.md`  
- **Gobernanza Cursor:** `.cursorrules` (§4 Francotirador, §7 Generar Prompt v0, §9 ecosistema mixto v8.0)

## 🛠️ Especificaciones de Código para v0.dev
1. **Framework:** Next.js 14 (App Router) + Tailwind CSS + Lucide React.
2. **Estructura:**
   - No generes `Layouts` ni `Providers`. Genera solo el componente interno.
   - Usa `BoxLoader` como concepto: el componente debe recibir un `manifest` opcional.
3. **Resiliencia:**
   - Incluye un estado de `loading` (Skeleton) y un estado de `error` local dentro del componente.
   - Si se detecta un fallo de fetch, el componente debe ser capaz de lanzar un error capturable.