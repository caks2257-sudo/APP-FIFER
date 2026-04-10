# Protocolo de ejecución AI — Leer primero

Este documento define **gobernanza**, **conceptos arquitectónicos** y **reglas estrictas** para que cualquier asistente o colaborador trabaje de forma coherente en un sistema modular tipo microfrontend sobre **Next.js (App Router)**.

---

## 1. Gobernanza de herramientas

| Rol | Herramienta | Responsabilidad |
|-----|-------------|-----------------|
| **Exploración visual y prototipo UI** | **v0** | Generar exploraciones de interfaz, variantes de layout y componentes visuales como punto de partida. No es la fuente única de verdad del código de producción. |
| **Ajustes puntuales y refinamiento** | **Cursor Chat** | Iterar sobre fragmentos concretos: copy, estilos, props, pequeños refactors, dudas de implementación. |
| **Andamiaje y estructura** | **Cursor Agent** | Crear rutas, carpetas, contratos TypeScript, shells de boxes, hooks, integración con `app/`, y cambios que tocan varios archivos de forma coordinada. |

**Principio:** quien genera la UI inicial no debe contradecir el mapa de `frontend_architecture.md` ni el contrato de `box_system.md` sin actualizar esos documentos.

---

## 2. Cascarón inteligente (Smart Shell)

Un **cascarón inteligente** es el contenedor que envuelve un micro-módulo (una “box”) y:

- Expone una **superficie estable** al resto de la app (mismo contrato `SmartBoxProps` en todas las boxes).
- Gestiona **estados transversales** (carga, error, vacío, bloqueo, interacción) sin mezclar la lógica de negocio interna de cada box.
- Permite **hidratación diferida (JIT)** del contenido pesado: el shell se monta pronto; el interior puede resolverse cuando haya datos o visibilidad.
- Mantiene **predecibilidad**: el padre no necesita conocer detalles internos de cada box, solo el contrato y el estado declarado por el shell.

Las boxes no “filtran” estilos globales arbitrarios hacia fuera; el cascarón acota el árbol de UI y los tokens de diseño.

---

## 3. Reglas estrictas

### 3.1 JIT-Hydration (hidratación just-in-time)

- Preferir **Server Components** por defecto; marcar como cliente (`"use client"`) solo lo imprescindible (DnD, listeners, estado local de UI).
- El **contenido costoso** (listas grandes, editores, gráficos) debe montarse cuando existan **datos listos** o **viewport / interacción** lo justifique, no en el primer paint innecesario.
- Evitar hidratar árboles enteros “por si acaso”; usar límites claros (loading en shell → contenido hidratado en hijo).

### 3.2 Tailwind sin CSS inline

- **Prohibido** usar `style={{ ... }}` para diseño habitual (colores, espaciado, tipografía, layout). Usar **clases de Tailwind** y utilidades del design system.
- **Excepciones mínimas** permitidas: valores verdaderamente dinámicos calculados en runtime (p. ej. posición de drag desde coordenadas) y que **no** puedan expresarse con clases estáticas o CSS variables ya definidas.
- Preferir **variables CSS** (p. ej. tema) sobre estilos inline ad hoc.

### 3.3 Variables y convenciones Biome

- **Biome** es la fuente de formato y lint del frontend: respetar `biome.json` del repo (o raíz del paquete).
- No desactivar reglas de forma global salvo acuerdo documentado; usar supresiones locales y justificadas solo cuando sea imprescindible.
- Imports ordenados y consistentes; sin código muerto introducido a propósito; tipos explícitos en APIs públicas (props de shells, hooks compartidos).

---

## 4. Orden de lectura recomendado

1. Este archivo (`000_read_first_protocol.md`)
2. `frontend_architecture.md` — mapa de carpetas y responsabilidades
3. `box_system.md` — Smart Boxes, estados y contrato TypeScript

---

## 5. Cambios al protocolo

Cualquier cambio que altere gobernanza, reglas estrictas o el contrato de boxes debe reflejarse **en el mismo PR** que el código que lo materializa, para evitar documentación obsoleta.
