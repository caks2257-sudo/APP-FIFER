# Fifer User DNA 2.0 — Protocolo de destilación

Este documento es el **ADN de uso** de FIFER: capas de retención para que la IA lea siempre un **resumen ejecutivo** y material estructurado, no un diario infinito.

**Convención:** el **Conserje** (`src/utils/dna-distiller.ts`) comprime **Momentum** (máx. 3 focos + línea *Contexto histórico*) y el **Log de interacciones** (cada 20 entradas); **no** altera **Financial Intelligence**. Tú editas capas estáticas y semi-estáticas a mano.

---

## Resumen ejecutivo *(leer primero)*

| Campo | Valor |
|-------|--------|
| **Quién** | Cristobal Kupfer |
| **Qué haces** | Arquitecto + Real Estate |
| **Pilares** | **FIFER** (OS / producto) · **ABKupfer** (marca / canal / stock) |
| **Territorio de confianza** | Chicureo (obra, regularización, inmobiliaria) |
| **Estética en una línea** | Deep Navy + acento Electric Yellow (`#EAB308`); minimalismo; materiales nobles |
| **Momentum actual** | Ver sección *Momentum* (máx. 3 focos) |

> *«Priorizar trámites y pipeline editorial alineados a Chicureo y ABKupfer; tono ejecutivo y claro en español (Chile).»*

---

## Core Identity (estático)

*No cambia salvo decisión explícita tuya.*

| Campo | Valor |
|-------|--------|
| **Nombre** | Cristobal Kupfer |
| **Roles** | Arquitecto · Real Estate |
| **Pilares de negocio** | **FIFER** — Living OS / dashboard / cajas · **ABKupfer** — inventario, campañas, contenido |
| **Territorio** | Chicureo — obras, regularización, proyectos inmobiliarios |
| **Idioma** | es-CL |
| **Nivel de detalle por defecto** | Ejecutivo con opción técnica bajo demanda |

---

## Estética y gustos (semi-estático)

*Actualizar solo si hay un cambio de tendencia o marca claro.*

- **Paleta:** Deep Navy (`#0A0F1E`) como lienzo; **Electric Yellow** (`#EAB308`) para acentos, CTA y foco (identidad FIFER); sin neón fuera de marca.
- **Estilo UI:** minimalismo funcional; mucho aire; jerarquía tipográfica clara.
- **Materiales / referencias:** maderas nobles, piedra, metal mate; evitar kitsch.
- **Motion:** sutil; nada distractor en flujos de trabajo.

---

## Momentum (dinámico)

*Qué te preocupa **ahora**. Solo **los últimos 3 focos activos**; al ejecutar el Conserje se eliminan entradas viejas de la lista.*

- Cerrar trámites en Valle Norte *(ejemplo)*
- *(foco 2)*
- *(foco 3)*

---

## Financial Intelligence (acumulativo)

*Aquí sí puede crecer el detalle para precisión de ROI y decisiones. El Conserje **deduplica** líneas repetidas en listas; no resume números por ti.*

### ROI y señales

- *(ej.: UF vs objetivo de campaña — actualizar con datos reales)*
- *(ej.: margen estimado por línea ABKupfer)*

### Tabla rápida *(opcional)*

| Concepto | Nota | Última actualización |
|----------|------|----------------------|
| *(concepto)* | *(breve)* | *(YYYY-MM-DD)* |

### Hitos *(una línea por hito; antiguos abajo)*

| Fecha | Evento |
|-------|--------|
| *(YYYY-MM-DD)* | *(ej. cierre de campaña / integración)* |

---

## Protocolo: The Janitor (El Conserje)

- **Qué hace:** analiza `_xray_USER_DNA.md`: en **Momentum**, si hay más de 3 focos, resume los antiguos en **una línea** `Contexto histórico`; en **Log de interacciones** (si existe), comprime tras **20** entradas. **Financial Intelligence** y **Core Identity** no se borran (aislamiento financiero).
- **Cuándo:** cada **20 interacciones** registradas vía `recordDnaInteraction()` (p. ej. tras aprendizaje pasivo en el cliente en **dev**), o manualmente: `npm run dna-janitor` en la raíz del monorepo.
- **Implementación:** `src/utils/dna-distiller.ts` · estado local: `src/modules/user/.dna-janitor-state.json` (ignorado por git). **No** toca `finance-data` ni el ledger de la app.
- **Qué no hace:** no elimina filas de *Financial Intelligence*; no inventa resúmenes con LLM.

---

## Privacidad y uso de este archivo

- Este archivo es de **uso local y privado** por defecto: personalización de la IA (instrucciones, tono) dentro del flujo FIFER / Cursor / herramientas que configures.
- **No** implica consentimiento para compartir datos personales con terceros.
- Los campos *inferidos* deben generarse solo con telemetría local explícitamente activada; evita volcar conversaciones completas sin anonimizar si hay riesgo para terceros.

---

*Alineado con el espejo v0 `10_USER_DNA.md`, `.cursorrules` y el protocolo shell del Living OS.*
