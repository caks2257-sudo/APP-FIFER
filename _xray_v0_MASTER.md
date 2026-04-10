# 🏗️ FIFER — Chasis global UI / X-Ray v0 MASTER

> **Rol:** Reglas **transversales** del ecosistema (grid, tipografía, compatibilidad IA, protocolo Box).  
> **Identidad por app:** cada aplicación define paleta y slots propios en **`[ruta_app]/_xray_v0_local.md`** (no mezclar estilos entre apps).  
> **Contrato técnico:** `src/types/fifer-box.ts` · **Orquestador:** `fifer-landing/src/components/core/BoxLoader.tsx`.

---

## ✍️ USER CUSTOM INSTRUCTIONS (PASTE HERE)

<!-- Motor creativo: pega aquí ideas artísticas, copy, referencias o matices de producto. -->

*(Vacío = solo reglas globales + identidad local del módulo en curso.)*

---

### Instrucción para Cursor (ingesta dinámica)

Cuando pegues aquí tus ideas, Cursor debe usarlas como **motor creativo** del prompt hacia v0, pero **filtrándolas** a través de:

1. **`_xray_v0_MASTER.md`** (este archivo) — chasis, grid, leyes IA, protocolo Box.  
2. **`_xray_v0_local.md` de la app en la que se trabaja** — paleta, gradientes permitidos, botones, Ghost local y slots propios.

No aplicar la paleta de una app a otra. Si la instrucción del usuario choca con el local, **prioriza** el X-Ray local de esa app para color/tono y el MASTER para estructura y compatibilidad.

---

## I. Leyes sistémicas (chasis global)

| Ley | Especificación |
|-----|----------------|
| **Grid** | Lienzo principal **12 columnas** (Tailwind `grid-cols-12`). Los Boxes ocupan spans (`col-span-*`) según `layout.minWidth` del manifiesto; **sin** `position: absolute` para definir el slot. |
| **Tipografía base** | **Montserrat** o sans-serif equivalente para títulos en **negrita**; cuerpo **Open Sans** / **Source Sans 3**. Jerarquía: H1/H2 bold, labels medium, datos regular. |
| **Contenedores / slots** | El dashboard es un **lienzo de slots** agnóstico: nombres estándar `slot-hero`, `slot-stats-grid`, `slot-main-content`, `slot-sidebar-nav`; slots semánticos por dominio (ej. `finance-stats`, `content-editor`) se documentan en cada **`_xray_v0_local.md`**. |

---

## II. Normas de compatibilidad IA (v5.6+)

1. **Prioridad RSC:** Server Components por defecto; `"use client"` solo en el archivo del Box si hace falta interactividad.  
2. **Tailwind en línea:** Solo clases Tailwind en `className`. **Prohibido** CSS externo, CSS Modules o styled-components en el artefacto v0.  
3. **Archivo único:** Un Box = **un `.tsx` autocontenido** (+ imports permitidos: `react`, `lucide-react`, tipos).

---

## III. Protocolo Box (inyección en el dashboard central)

1. Cada app expone **Fifer Boxes** como componentes envueltos por **`BoxLoader`**.  
2. **`IFiferBoxManifest`** define `boxId`, `sourceModule`, `targetSlot`, `layout`, `permissions`, `dataDependencies`, `fallbackStrategy`, y opcionalmente **`themeOverrides`** (paleta por app inyectada como variables CSS en el contenedor).  
3. Props estándar del componente v0: **`data`**, **`config`**, **`isLocked`**, **`isRefining`** (shell / Protocolo SDUI). Sin `fetch` interno salvo orden explícita.  
4. **Ghost / BYOK:** `BoxLoader` aplica skeleton, overlay de bloqueo o `fallbackStrategy`; el diseño local documenta tonos del Ghost en **`_xray_v0_local.md`**.

---

## IV. Generador de prompts v0 (merge)

Al pedir **«Generar Prompt v0»**, el resultado = **[USER CUSTOM INSTRUCTIONS]** + **[este MASTER]** + **`_xray_v0_local.md` de la app activa]**, más recordatorio: no hardcodear datos de negocio; usar Boxes + manifiesto.

### Bloque base sugerido (plantilla)

Plantillas largas y checklist extendido: **`_xray_frontend_v0_bridge.md`**. El archivo **`fifer-landing/_xray_landing.md`** es solo puntero legacy.

**User DNA (despacho v0 — `10_USER_DNA.md`):** El archivo **10** contiene la **esencia de Cristobal** (versión destilada). Úsalo para que los widgets se sientan **personales**, pero mantén la **UI limpia**. No satures con información histórica; prioriza lo relevante para sus **metas actuales** en **Chicureo** y **ABKupfer**.

**Mínimo en todo prompt v0:**

- Stack: React + TypeScript + Tailwind (inline).  
- Tema oscuro; colores concretos según **X-Ray local** de la app.  
- Props: `data`, `config`, `isLocked`.  
- Un archivo `.tsx` en `fifer-landing/src/components/v0-ingestion/`.

---

## V. Contrato `IFiferBoxManifest` (resumen)

Definición completa en **`src/types/fifer-box.ts`**. Incluye opcionalmente **`themeOverrides`**: `{ primary?, secondary?, accent?, surface?, onPrimary? }` (hex) → `BoxLoader` inyecta `--fifer-box-primary`, `--fifer-box-accent`, etc., en el `<section>` del slot (hijos y Ghost pueden usar `var(--fifer-box-accent)`).

---

## VI. Mapa de slots (referencia global)

| Slot | Uso típico |
|------|------------|
| `slot-hero` | Cabecera / impacto |
| `slot-stats-grid` | KPIs |
| `slot-main-content` | Formularios / tablas |
| `slot-sidebar-nav` | Panel lateral |

Slots adicionales por dominio: ver **`_xray_v0_local.md`** de cada app.

---

## VII. Rutas clave

| Recurso | Ruta |
|---------|------|
| Contrato TS | `src/types/fifer-box.ts` |
| BoxLoader | `fifer-landing/src/components/core/BoxLoader.tsx` |
| Ingesta v0 | `fifer-landing/src/components/v0-ingestion/` |
| Manifiestos JSON | `fifer-landing/src/components/core/manifests/` |
| Puente checklist | `_xray_frontend_v0_bridge.md` |
| X-Rays locales UI | `[app]/_xray_v0_local.md` |

---

## VIII. Enlaces legacy

- **`fifer-landing/_xray_landing.md`** — redirige a este MASTER + local landing; se mantiene por compatibilidad con enlaces antiguos.

## IX. Cerrojo Cursor — fases edición / auditoría de cierre

- **Fase de edición:** la IA se atiene a MASTER + LOCAL + **`.cursorrules`**; **no** amplía arquitectura global ni estilos base por iniciativa propia; si la orden del usuario **choca** con una ley documentada, **avisar primero**.
- **Fase de evolución (cierre):** tras trabajo finalizado y aprobado, sincronizar según **`.cursorrules` §0.2** y **§0.36**; **`.cursorrules`** y **`_xray_v0_local.md`** del radio solo si quedó **validado** un patrón o tecnología **nueva** no reflejada aún en normativa.
- **Frase de cierre obligatoria en chat:** ver **`.cursorrules` §0.36** (variantes X = 0 / X > 0).

## 🤖 SECCIÓN PARA IA (v0/Gemini Prompting)
> **Rol:** Eres el Arquitecto UI de FIFER. Al generar código, sigue estas reglas:

> **ADN de usuario:** El archivo **10** es la **esencia** de Cristobal (destilada). Personaliza **personalización** y **alertas inteligentes** con sensación cercana, pero **UI limpia** — sin saturar de historia; foco en **metas actuales** **Chicureo** / **ABKupfer**.

### 🎨 Design Tokens (Tailwind)
- **Fondo:** `bg-[#0A0F1E]` (Deep Navy)
- **Acento:** `text-[#EAB308]` o `bg-[#EAB308]` (Yellow Electric)
- **Bordes:** `border-[#EAB308]/20` con `rounded-[0.75rem]`
- **Grid:** Layout de 12 columnas (`grid-cols-12`).

### 🧩 Protocolo Fifer Box
- **Contenedor:** Todo componente debe ser un "Box" exportable.
- **Data:** PROHIBIDO hardcodear datos. Usa una interfaz `data` y prepara el componente para **JIT Hydration**.
- **Jerarquía:** Usa tipografía `Inter` o `Geist` con pesos semibold para títulos.

---
*Auditoría X-Ray · Última sincronización: 2026-04-08*