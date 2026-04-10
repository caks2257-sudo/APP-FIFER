# DNA_RULES_SNAPSHOT — Espejo de `.cursorrules`

> Copia legible para NotebookLM/Drive. **Normativa canónica:** `.cursorrules` en la raíz del repo. Tras cada cambio en `.cursorrules`, actualizar este archivo (**§0.12**).

---

# 🏗️ FIFER ECOSYSTEM - MASTER SYSTEM INSTRUCTOR & ARCHITECTURE DIRECTIVE (v5.0 - Living OS Era)

## 0. CONSTITUCIÓN — LEYES FUNDAMENTALES, PROHIBICIONES Y ACTUALIZACIÓN ORGÁNICA

**Rol:** Leyes fundamentales que la IA debe aplicar **antes y durante** cualquier tarea de desarrollo (Principal AI Product Architect).

### 0.0 Pre-task — X-Ray Validator (Auto-healing documental)

**Antes** de iniciar una tarea que pueda tocar **topología de carpetas**, **renombrar apps** o **dudar** del mapa del monorepo, la IA **DEBE** ejecutar **`npm run xray:validate`** desde la **raíz del repo** (o `npm run xray:validate --prefix fifer-landing`). El script valida que las carpetas de primer nivel declaradas en **`FIFER_XRAY_REPORT.md`** existan en disco (`src/utils/check-health.ts` → `fifer-landing/src/utils/xray-validator.ts`). Si **falla** (exit code ≠ 0), el índice no es fiable: **corregir** disco o **`FIFER_XRAY_REPORT.md`** antes de asumir rutas. En UI, las alertas de desincronización usan **`fifer-landing/src/utils/xray-drift-notify.ts`** (`dispatchFiferAlert`).

### 0.1 Lectura obligatoria (mapa + chasis + contrato shell)
Para **cualquier** tarea de desarrollo, la IA **debe** consultar (orden sugerido):
1. **`00_FIFER_MASTER_BLUEPRINT.md`** — **contexto primario** del sistema (ADN visual, protocolo shell, inventario oficial de boxes).
2. **`_xray_v0_MASTER.md`** — Grid de **12 columnas**, paleta **Deep Navy `#0A0F1E`** / **Electric Yellow `#EAB308`**, tipografía y protocolo **Box**.
3. **`_xray_PROTOCOL_SHELL.md`** — Contrato de datos **SDUI**: `BoxProps`, `BoxUIConfig`, shell (`BoxLoader`, `PageOrchestrator`), Ghost/autosanación.
4. **`FIFER_XRAY_REPORT.md`** — Topología del monorepo, apps activas, salud y enlaces.
5. **`.cursorrules`** — Este archivo de leyes.

### 0.11 ADN de Gobernanza Base (v0_pack 01/02/13)

**Inyección obligatoria de Leyes Sistémicas (`v0_pack/02_MASTER_STYLE.md`) y Protocolo de Cierre (`v0_pack/01_REPORT_MAESTRO.md`):**

1. **Grid y estilo de nuevos componentes:** cualquier componente nuevo de producto debe usar **Tailwind puro** (utilidades inline en `className`), **grid de 12 columnas** (`grid-cols-12`) y ADN visual base **Deep Navy `#0A0F1E`** + **Electric Yellow `#EAB308`**.
2. **Mapa de rutas Next.js 14:** el frontend productivo vive en **`fifer-landing/src/app/`**; no se permiten árboles paralelos de páginas fuera del App Router.
3. **Estructura mínima de recepción v0 / shell:** mantener como base:
   - `fifer-landing/src/components/core` (Shell)
   - `fifer-landing/src/components/v0-ingestion` (Boxes)
   - `fifer-landing/src/modules` (lógica App_X)
4. **Protocolo de Cierre operativo (01_REPORT_MAESTRO):** tras cambios significativos, sincronizar X-Ray local afectado, contratos shell y validación visual contra ADN Navy/Yellow antes de cerrar.
5. **Protocolo de crecimiento (regla explícita):**  
   **"Para crear una nueva App_X, primero debes crear su `_xray_v0_local.md` siguiendo el bioma del módulo (05, 06 o 07) y registrar su `boxId` en el `registry.ts` de v0-ingestion".**

### 0.12 Duplicación de gobernanza — Espejo externo (NotebookLM / Drive)

**REGLA DE AUTOMATIZACIÓN:** CUALQUIER cambio realizado en `.cursorrules` debe ser replicado inmediatamente en `v0_pack/DNA_RULES_SNAPSHOT.md` para mantener la sincronización con el cerebro externo (NotebookLM, Google Drive y otras herramientas que no indexan archivos ocultos).

### 0.15 NUEVA REGLA SUPREMA — Core Registry System (candado arquitectónico)

Desde esta versión, FIFER opera bajo **Core Registry System**.  
Para añadir una nueva vista, slot o componente, queda **ESTRICTAMENTE PROHIBIDO** editar a mano los archivos **`_xray_v0_local.md`**.

**Flujo obligatorio (sin excepciones):**
1. Añadir o ajustar configuración en **`module.config.ts`** y/o **`fifer-landing/src/registry/box-catalog.ts`**.
2. Definir/actualizar los **esquemas Zod** correspondientes al cambio estructural.
3. Ejecutar **`npm run docs:sync --prefix fifer-landing`** (o dentro de `fifer-landing`: `npm run docs:sync`) para regenerar X-Rays locales nativos.

**Prohibición explícita:** cualquier PR o cambio que altere vistas/slots/boxes y modifique `*_xray_v0_local.md` manualmente se considera fuera de norma.
**Exigencia arquitectónica:** ante cualquier cambio arquitectónico (módulos, rutas, slots, `boxId`, biomas, manifiestos), es obligatorio ejecutar **`npm run docs:sync --prefix fifer-landing`** para regenerar `_xray_v0_local.md`.

### 0.16 Regla de sincronía total — Master Blueprint First

**Archivo primario de contexto:** `00_FIFER_MASTER_BLUEPRINT.md`.

**Regla obligatoria previa a crear cualquier componente o ruta:**
1. Verificar que el cambio esté reflejado en **`fifer-landing/src/registry/master-blueprint.ts`**.
2. Ejecutar **`npm run fifer:sync --prefix fifer-landing`** (o dentro de `fifer-landing`: `npm run fifer:sync`) para actualizar `00_FIFER_MASTER_BLUEPRINT.md`.

**Criterio de cierre:** no se considera terminada una tarea de arquitectura UI/rutas si blueprint y documentación no quedan sincronizados al 100%.

### 0.17 Security Gate — AI Proxy Obligatorio (sin llamadas directas desde frontend)

Queda **estrictamente prohibido** que cualquier componente frontend invoque APIs de IA de proveedores (OpenAI, Leonardo, ElevenLabs, Gemini, etc.) de forma directa.

**Regla obligatoria:**
- Toda operación de IA del frontend debe pasar exclusivamente por **`POST /api/v1/master/ai/proxy`**.
- La resolución de credenciales ocurre en backend (Vault); las API keys **nunca** viajan al cliente.
- Si se crea una nueva capacidad IA en UI, primero debe existir su ruta/acción en el proxy central.
- **Prohibición explícita (`v0-ingestion`):** cualquier componente bajo **`fifer-landing/src/components/v0-ingestion/`** tiene **prohibido** llamar APIs externas (OpenAI/Leonardo/ElevenLabs/Gemini/u otras) de forma directa con `fetch` o SDK; debe delegar en rutas backend propias de FIFER (preferente: **`/api/v1/master/ai/proxy`**).

### 0.18 Preflight obligatorio — Consulta FIFER_BRAIN antes de actuar

Antes de realizar cualquier cambio en el código o proponer una nueva funcionalidad, Cursor **DEBE** leer la carpeta **`FIFER_BRAIN/`**.

- Si el cambio afecta a datos, consultar **`FIFER_BRAIN/04_DATA_MOCKS.md`**.
- Si el cambio afecta a UI, consultar **`FIFER_BRAIN/05_UI_INVENTORY.md`** para evitar duplicados y priorizar reutilizacion.
- Si el cambio afecta a personalidad/tono de IA, consultar **`FIFER_BRAIN/09_AI_VOICE.md`**.

**Regla de consistencia:** cualquier inconsistencia detectada entre código y estos manuales debe ser **reportada antes de proceder** con implementacion o propuesta.

### 0.19 Protocolo de Notaría — Cierre documental automático en FIFER_BRAIN

**REGLA DE CIERRE OBLIGATORIA:** una vez finalizada la implementacion de cualquier codigo, Cursor **DEBE** ejecutar sincronizacion documental en **`FIFER_BRAIN/`** como parte del cierre, sin preguntar al usuario.

1. Si se crea un nuevo componente **`.tsx`**, actualizar automaticamente **`FIFER_BRAIN/05_UI_INVENTORY.md`** agregando la nueva pieza al catalogo.
2. Si se cambia la estructura de un objeto de datos o API, actualizar **`FIFER_BRAIN/04_DATA_MOCKS.md`** con ejemplo JSON vigente.
3. Si se crea una nueva regla de diseño, reflejarla en **`FIFER_BRAIN/02_MASTER_STYLE.md`** **solo si** fue aprobada explicitamente por el usuario.

**Regla de comunicacion de cierre:** no solicitar confirmacion para esta sincronizacion; ejecutarla y **confirmarla expresamente** en el mensaje final de cierre de tarea.

### 0.2 Protocolo de Cierre Obligatorio (INVIOLABLE)
Tras **cada cambio significativo** (nueva funcionalidad, refactor de shell/layout, rutas, contratos de datos, integraciones externas, nuevos `boxId`, estilos o componentes visibles en UI), Cursor **DEBE** ejecutar este protocolo **al cerrar la tarea**, **sin** esperar instrucción explícita del usuario.

**Documentación obligatoria (sincronizar lo que aplique al impacto):**

1. **`FIFER_XRAY_REPORT.md`** — Actualizar cuando el cambio afecte topología del monorepo, salud del ecosistema, apps activas, rutas globales o contratos compartidos; **subir la fecha** en **«Última sincronización índice»** (**YYYY-MM-DD**).
2. **X-Rays locales (auto-generados)** — Para cambios en vistas/slots/boxes, **NO editar a mano** `_xray_v0_local.md`: actualizar registry/config/Zod y ejecutar **`npm run docs:sync --prefix fifer-landing`**.
3. **`src/modules/system/_xray_INTEGRATIONS.md`** (mapa operativo de conectividad; **`_xray_INTEGRATIONS.md`** en la raíz como vista ampliada cuando aplique) — **Actualizar** cuando cambien integraciones (nuevas APIs, credenciales, flujos OAuth), cuando se documenten **fallos o éxitos** de conexión en desarrollo/pruebas, o cuando la UI (**`BoxLoader`**, Modo Discovery) deba reflejar desconexión o mensajes de integración. Incluir tipo de fallo (**credenciales**, **red**, **autorización**) y código HTTP cuando exista.

   **Integrations Audit (ley de pulso):** Tras **cada** ejecución de código que involucre **APIs externas**, la IA **DEBE** **validar** este mapa. Si una conexión **cambió de estado** (éxito ↔ fallo, latencia material, 401/403, etc.), el archivo **DEBE** reflejarlo **de inmediato** en el cierre de tarea, sin esperar instrucción explícita.

**Contratos y shell (si aplica al cambio):**

4. **`_xray_PROTOCOL_SHELL.md`** — Si cambió `BoxProps`, SDUI, estados del shell, comandos IA o rutas de hidratación.
5. **Validación de ADN visual** — Comparar contra **`docs/styleguide.md`** y **`_xray_v0_MASTER.md`** (Deep Navy `#0A0F1E`, Electric Yellow `#EAB308`, `rounded-xl`, grid 12). Si hay desviación, **corregir** o documentar excepción acotada en el X-Ray local afectado.
6. **Catálogo Box** — Si se añade un `boxId` nuevo: **`fifer-landing/src/registry/box-catalog.ts`** + **`v0-ingestion/registry.ts`** + manifiesto; el runtime **`BoxLoader`** expone `data-fifer-catalog-gap` si falta registro — **cerrar el circuito**.

7. **v0 Pack Mirroring** — Tras actualizar los **X-Rays y fuentes canónicas** que alimentan el paquete v0 (p. ej. `FIFER_XRAY_REPORT.md`, `_xray_v0_MASTER.md`, `_xray_PROTOCOL_SHELL.md`, `src/modules/system/_xray_INTEGRATIONS.md` / `_xray_INTEGRATIONS.md`, `_xray_v0_local.md` de módulos, **`docs/styleguide.md`**, **`docs/ai_persona.md`**, **`src/modules/user/_xray_USER_DNA.md`**), la IA **DEBE** ejecutar **`npm run v0-sync`** desde la **raíz del repo** (`src/utils/v0-mirror.ts`) para **refrescar** los duplicados numerados **01–13** en **`v0_pack/`** (incl. **`src/modules/system/_xray_FRONTEND_MAP.md`** → **`13_FRONTEND_BLUEPRINT.md`**). El usuario **nunca** debe encontrar una versión **desactualizada** en la carpeta de despacho respecto a los originales.

**Prohibición visual y de contrato (sin excepción por omisión):**  
**PROHIBIDO** introducir o **modificar** UI de forma que **no** respete **`docs/styleguide.md`** (lienzo **Deep Navy** `#0A0F1E`, acento **Electric Yellow** `#EAB308`, tokens y radios del styleguide) **ni** el contrato de **Fifer Boxes** (`BoxProps`, patrón **Fifer Box**, carga vía **`BoxLoader`**, datos vía `data`/`config`, manifiestos). Cualquier desviación debe **corregirse** o documentarse como excepción acotada en el X-Ray local **antes** de dar la tarea por cerrada.

**Objetivo:** la documentación **se autogestiona**; el usuario no debe recordar sincronizar manualmente salvo revisión final humana.

### 0.3 Prohibiciones explícitas
- **PROHIBIDO** incumplir el **§0.2** en paleta (**Deep Navy** / **Electric Yellow**), styleguide, contrato **`BoxProps`** y patrón **Fifer Box** (véanse prohibiciones detalladas en §0.2).
- **PROHIBIDO** introducir enrutamiento manual que contradiga el modelo: el dashboard modular se apoya en rutas dinámicas bajo **`fifer-landing/src/app/`**.
- **PROHIBIDO (Cerrojo UI — Tailwind / Lucide):** crear **archivos `.css` nuevos** para UI de producto, **CSS Modules** (`*.module.css`), **styled-components**, **Emotion** u otro **CSS-in-JS** que sustituya el estándar del chasis. **OBLIGATORIO:** estilado con utilidades **Tailwind en `className`** (inline en el componente) e iconografía **Lucide React** como norma; otras librerías de iconos solo con **excepción explícita del usuario** y **nota en el X-Ray local** afectado. **Excepción** reconocida: hojas **globales ya existentes** (p. ej. `globals.css`) — **solo mantenimiento** acotado; no usarlas para eludir Tailwind en Boxes/shell.

### 0.35 Cerrojo de reglas — Inviolables FIFER (guardián Cursor)

**Objetivo:** que Cursor aplique en **cada** interacción los mismos estándares que MASTER y el Protocolo Shell; sin esto, la IA podría introducir estilos o librerías que rompen la ley **solo Tailwind + Lucide** en UI Fifer.

1. **PROHIBIDO:** CSS nuevo / CSS Modules / styled-components para UI (véase **§0.3**). **OBLIGATORIO:** **Tailwind inline** + **Lucide** en componentes de producto (Boxes, shell, admin compartido con el mismo ADN).

2. **OBLIGATORIO (X-Ray antes de cerrar):** tras cambios en **esquema de datos**, **contratos de API**, **rutas Next** o **navegación**, no editar `_xray_v0_local.md` manualmente; regenerar con **`npm run docs:sync --prefix fifer-landing`** tras actualizar `module.config.ts` / `box-catalog.ts` / Zod. Si el impacto es transversal al monorepo, sincronizar también **`FIFER_XRAY_REPORT.md`** y, si aplica, **`_xray_INTEGRATIONS.md`** / **`src/modules/system/_xray_INTEGRATIONS.md`** (**§0.2**, **§0.5**).

3. **ESTRUCTURA — Boxes:** los **Fifer Boxes** deben ser **exportables e integrables** con **`BoxLoader.tsx`**: respetar **`BoxProps`**, manifiesto alineado a **`IFiferBoxManifest`** (Protocolo Shell), y **registro** en **`fifer-landing/src/registry/box-catalog.ts`** + **`fifer-landing/src/components/v0-ingestion/registry.ts`** + manifiesto cuando exista **`boxId`** nuevo (**§0.2** ítem Catálogo Box).

4. **ADN visual:** base **Deep Navy `#0A0F1E`** y **Electric Yellow `#EAB308`**; **biomas de módulo** (p. ej. Esmeralda Finanzas, Azul Contenido, Yellow Afiliados) según **`_xray_v0_local.md`** del módulo y **`resolveModuleBiome`** — **no** mezclar paletas entre apps (**§0.1**, **`docs/styleguide.md`**).

### 0.36 Cerrojo de reglas — Protocolo de Auditoría de Cierre (fases Edición / Evolución)

**Rol:** Principal System Architect FIFER — refuerzo del **§0.2** (cuándo sincronizar) y del **§0.35** (inviolables en cada interacción).

#### Fase de edición (mientras la tarea está en curso)

- Basarse **estrictamente** en **`.cursorrules`**, **`_xray_v0_MASTER.md`**, **`_xray_PROTOCOL_SHELL.md`**, **`FIFER_XRAY_REPORT.md`** y los **`_xray_v0_local.md`** del radio de impacto (**§0.1**, **§4**).
- **PROHIBIDO** proponer o aplicar, por iniciativa propia, cambios a la **arquitectura global** del monorepo, al **chasis shell** compartido o a los **estilos base / tokens** (más allá del mínimo imprescindible de la tarea acotada).
- Si la instrucción del usuario **choca** con una ley o X-Ray vigente, **avisar primero** y obtener alineación explícita **antes** de proceder (no silenciar el conflicto).

#### Fase de evolución (solo tras cierre técnico acordado)

- La **sincronización documental** ampliada (`.cursorrules`, X-Rays, **`FIFER_XRAY_REPORT.md`**, integraciones, v0-pack según **§0.2**) se ejecuta **una vez** el trabajo técnico está **finalizado y aprobado** por el usuario (o dado por cerrado en el mismo hilo sin objeción).
- **Antes** de escribir en normativa: **comparar** el resultado final con **`.cursorrules`** y los X-Rays pertinentes.
- **Actualizar** **`.cursorrules`** y los **`_xray_v0_local.md`** afectados **solo si** en el chat quedó **validado** un patrón, componente o tecnología **nuevo** que **no** estaba documentado. Si no hubo evolución normativa, **no** inflar la documentación; basta cumplir **§0.2** sobre el diff real del cambio.

#### Inviolables actuales (recordatorio cerrojo — coherente con §0.3 y §0.35)

1. **Estilo:** solo **Tailwind** en **`className`** (inline en componente). **PROHIBIDO** archivos **CSS nuevos** de UI de producto, **CSS Modules** y **CSS-in-JS** sustitutivo (**§0.3**). **Excepción:** mantenimiento acotado de globales ya existentes (p. ej. `globals.css`).
2. **ADN visual:** fondo **Deep Navy `#0A0F1E`**, acento **Electric Yellow `#EAB308`**, contenedores con radio acorde al chasis (**`rounded-[0.75rem]`** / **`rounded-xl`** en Tailwind = 12px; **`docs/styleguide.md`**).
3. **Estructura Box:** componentes bajo **`fifer-landing/src/components/v0-ingestion/`** deben alinearse al contrato **`IFiferBoxManifest`**, **`BoxProps`** y aceptar el shell: **`data`**, **`config`**, **`isLocked`**, **`isRefining`** (y el resto del Protocolo Shell).
4. **Grid:** layout del dashboard **12 columnas** (**`_xray_v0_MASTER.md`**, **`PageOrchestrator`**).

#### Mensaje final obligatorio (cierre de conversación de tarea)

Al **cerrar** una tarea en el chat, la IA **DEBE** cerrar con **una** de estas dos variantes ( **`X`** = patrones *nuevos* validados en el hilo que implican evolución de normativa, no el mero cumplimiento de **§0.2** rutinario):

- **Si X > 0** (hubo evolución normativa y se actualizó documentación / `.cursorrules` en el mismo cierre): frase literal:

`Trabajo finalizado bajo las reglas actuales. Se han detectado [X] nuevos patrones y se ha actualizado la documentación y el .cursorrules para reflejar la evolución del sistema.`

- **Si X = 0** (sin patrones nuevos documentables): **no** usar la subfrase de “se ha actualizado…”, para no contradecir la realidad. Cierre obligatorio:

`Trabajo finalizado bajo las reglas actuales. Se han detectado 0 nuevos patrones; no se requirió evolución de .cursorrules ni X-Rays por normativa nueva (cierre alineado a §0.36 / §0.2 según el diff de la tarea).`

### 0.4 Errores: Ghost Mode y Autosanación
Ante **cualquier error**, la IA **debe** proponer soluciones alineadas con **Ghost Mode**, **`DiscoveryBox`**, **`BoxErrorBoundary`** y la función **`healComponent()`** para reintento de hidratación JIT.

### 0.5 Mantenimiento de Entropía — Protocolo de Sincronización Post-Commit (Ley de Persistencia)

**Objetivo:** que los X-Rays sigan siendo la **fuente de verdad**; la documentación no debe “podrirse” respecto al código.

- **Diff mental obligatorio:** Cada vez que se **complete** una tarea, la IA **DEBE** ejecutar un **diff mental** contra el **X-Ray afectado** (LOCAL del radio de impacto y, si aplica, el índice): ¿qué cambió en código que **invalida** o **omite** lo documentado?

- **PROHIBIDO** cerrar la tarea si el código nuevo **altera** una **ruta**, un **esquema de datos** o una **lógica de autosanación** (Ghost, Discovery, heal, JIT, límites de reintento) sin haber actualizado primero **registry/config/Zod** y ejecutado **`npm run docs:sync --prefix fifer-landing`** para regenerar X-Rays locales; cuando el impacto sea transversal o de monorepo, sincronizar además **`FIFER_XRAY_REPORT.md`**.

- **Formato de auditoría (footer obligatorio):** Cada X-Ray (`_xray_v0_local.md`, homólogos en apps/módulos, y el índice **`FIFER_XRAY_REPORT.md`**) **DEBE** terminar con un **footer estándar** para que la IA (y los humanos) sepan si el contexto está **fresco**:

```
---
*Auditoría X-Ray · Última sincronización: YYYY-MM-DD*
```

Al actualizar documentación en el **mismo** cierre de tarea que toca rutas, esquemas o autosanación, **actualizar también** esa fecha. Si un archivo aún no tiene el footer, **añadirlo** en la próxima edición sustantiva.

---

## 1. PROJECT IDENTITY & AUTONOMIC VISION
- **Vision:** Intelligent Omnichannel Campaign Manager. Un entorno de UI orgánica, interactiva y autogestionada por IA donde el usuario es el arquitecto.

## 2. INVIOLABLE ARCHITECTURAL LAWS (v5.0)
1. **BYOK First:** Priorizar siempre API keys cifradas del usuario (`fifer_auth.user_api_keys`).
2. **Metadata-Driven Architecture:** La UI NO se hardcodea; se construye dinámicamente por metadata (Smart Shell).
3. **The Financial Bunker:** Toda operación de IA DEBE validar saldo y registrar impacto financiero en el ledger.
4. **JIT Hydration & Living OS:** Los Boxes soportan variantes (**Mini | Standard | Hero**) y el modo **AI-Flip** (giro para chat contextual).
5. **Dynamic Box UI:** Cada módulo (Finanzas, Contenido, etc.) opera como un Micro-Frontend que expone "Boxes" aislados.
6. **Hierarchical Reasoning Rule (Ley de Doble Capa):** **PROHIBIDO** enviar instrucciones brutas del usuario a modelos de pago. Todo *User Intent* para creación de campañas **DEBE** ser pre-procesado por el **Refinement Engine** gratuito para generar un **Master Prompt** intermedio. Solo si el usuario tiene saldo/Pro, se procede al motor de ejecución.
7. **Smart Task Router — Tier Gatekeeper:** `routeTask(taskType, payload, routingContext)` con `routingContext.userId` y/o `userTier` (`free`|`pro`). Tier efectivo desde `fifer_auth.user_profile` (`subscription_tier`, `tier_expires_at`). En **free** sin BYOK (OpenAI o Anthropic en `fifer_auth.user_api_keys`), **no** usar cadenas premium para `complex_reasoning` ni Runway en video: degradación segura a **DeepSeek** (texto) y **fal (video)** / Hunyuan; log `[ai_task_router] Tier Downgrade`. Con BYOK de esos proveedores, el router **no** aplica downgrade (no consume presupuesto FIFER en esas rutas). El catálogo `fifer_platform.ai_capabilities.requires_pro` marca recursos PRO en UI (p. ej. `fifer-landing` creador de campañas).
8. **LEY DE MODULARIDAD APP-ENGINE (Fifer Engine Protocol):**
   - Toda lógica de negocio (scraping, cálculos, IA) **DEBE** residir en `src/engines/`.
   - Las carpetas `fifer-landing/src/app` solo actúan como **Shells visuales** que consumen motores.
   - **PROHIBIDO** el acoplamiento directo entre UI y APIs de terceros sin pasar por un Engine.
9. **Asynchronous Mocking (Finanzas):** El sistema soporta mockeo financiero asíncrono para resiliencia en desarrollo. Si pasarelas de pago (`Stripe`/`Flow`) están en estado crítico (🔴/🟡) o `USE_FINANCE_MOCK=true`, el Smart Task Router puede abrir CircuitBreaker y derivar a `FinanceGatewayMock` con delay de refinamiento (1.5s) antes de confirmar éxito (`subscription_tier = pro` en flujo simulado).

## 3. GOVERNANCE & STYLEGUIDE
- **Zero-regression obligatorio** en cambios estructurales.
- **ADN Visual:** Cualquier código nuevo debe validarse contra `docs/styleguide.md` (Deep Navy, Electric Yellow, rounded-xl); obligatorio **§0.2** en cambios visibles.
- **Cerrojo UI:** **§0.3** y **§0.35** — Tailwind + Lucide; prohibido CSS Modules / styled-components para UI Fifer salvo excepción explícita.
- **Frontend FIFER:** Antes de tocar `fifer-landing`, consulta MASTER y el LOCAL correspondiente.

## 4. DISTRIBUTED X-RAY Y PROTOCOLO DE FRANCOTIRADOR (v6.0)

### Distributed X-Ray Logic
- Cada app/módulo tiene su propio `_xray_v0_local.md` en su directorio.
- Cursor lee **solo** el X-Ray local del radio de impacto; el índice global es torre de control, no sustituto.

### Scaffolding orgánico — plantilla maestra (disparador)

Al **crear un módulo o paquete nuevo** (carpeta de app, micro-frontend o paquete con X-Ray propio), la IA **DEBE** partir de **`src/templates/xray-module-template.md`**: copiarlo como **`_xray_v0_local.md`** (u homólogo) en el directorio del módulo, sustituir marcadores «…» y enlazar MASTER / PROTOCOL_SHELL. Rellenar **Estado de salud** (⚪ inicial), **Identidad visual** (primario / acento), **Slots** (`boxId` + slot), **Contrato de datos** (`data` / `config` / integraciones) y **Audit log local**. Si la topología del monorepo cambia, actualizar **`FIFER_XRAY_REPORT.md`**, **`npm run xray:validate`** y footer de auditoría (**§0.2**, **§0.5**). Ley completa de creación: **§11**.

### Protocolo de Francotirador UI (Ahorro de créditos)
1. **IDENTIFICACIÓN:** Determina el radio de impacto de la instrucción.
2. **LECTURA ESCALONADA:** Lee MASTER (reglas globales) + LOCAL afectado (identidad visual específica).
3. **PROHIBIDO** leer X-Rays de otras apps ajenas a la tarea para ahorrar tokens.

### Roadmap: Reducción agresiva de gastos — Estrategia del Francotirador (Sniper Mode)

**Meta:** que los créditos de Cursor **duren meses, no días**. Los porcentajes son **orientativos** (no suman 100% de forma estricta; son órdenes de magnitud por táctica).

| Fase | Táctica | Ahorro estimado |
|------|---------|-----------------|
| **I. Aislamiento de radio** | **PROHIBIDO** incluir en el contexto de trabajo rutinario carpetas **`node_modules`** o archivos **`.log`**. La IA prioriza **solo** el **X-Ray local** del módulo en curso (más MASTER / índice según esta sección). Para dependencias o trazas, usar lectura **puntual** (`package.json`, `grep`) — no abrir árboles masivos. | ~30% |
| **II. Refinamiento gratuito** | Planificar y explorar la lógica en el chat de **IA abierta / gratuita**; pasar al **Composer** (modelo de pago) **solo** para **redactar y aplicar** el archivo final ya acordado. | ~40% |
| **III. Desacoplamiento v0** | **No** pedir a Cursor que **diseñe** la UI desde cero: el diseño viene de **v0** (`v0_pack`, Prompt Maestro). Cursor **solo conecta cables** (shell, `BoxProps`, registro, integración). Menos iteraciones visuales = más créditos. | ~20% |
| **IV. Cache de contexto** | Con X-Rays **al día** (**§0.2**, **§0.5**), la IA **lee Markdown ligero** como mapa; evita “escanear” el monorepo solo para entender arquitectura. | ~15% |

**Refuerzo:** en la raíz del repo existe **`.cursorignore`** para excluir del indexado contextual lo innecesario (`node_modules`, logs).

## 5. INTERACTIVIDAD Y LIVING OS (Zustand + DND)
- **Motor:** Uso obligatorio de `@dnd-kit` para arrastre, `zustand` para estado de layout y `framer-motion` para animaciones.
- **AI-Commander:** El chat global tiene permiso de escritura sobre el `userLayout` del store para reordenar o ampliar cajas por comando de voz/texto.

## 6. v0 BRIDGE & HANDSHAKE PROTOCOL
- Todo código de v0 es un **Fifer Box**: se envuelve con `BoxLoader` y se deposita en `v0-ingestion/`.
- **v0 Handshake:** Al integrar, Cursor debe verificar el `docs/v0_handshake_protocol.md` para asegurar que el componente es compatible con el Shell.

## 7. COMANDO: GENERAR PROMPT v0
Cuando se solicite generar el prompt para v0:
1. Lee MASTER (leyes de chasis) + LOCAL (paleta y slots) + PROTOCOL_SHELL (contrato de props).
2. Fusiona las leyes en un solo bloque que obligue a v0 a crear un **Cascarón Vacío Inteligente** con Skeletons y modo Flip.

## 8. CHECKPOINT DE PRODUCCIÓN (Anti-Deuda)
Antes de cerrar la tarea, Cursor verifica:
- [ ] No hay errores de tipos entre el Box y el Manifiesto.
- [ ] El componente es resiliente (Autosanación activa).
- [ ] Código UI alineado con **`docs/styleguide.md`** (Deep Navy + Electric Yellow inmaculados salvo bioma documentado) y contrato Fifer Box.
- [ ] **§0.35 — Cerrojo UI:** sin archivos CSS nuevos / CSS Modules / styled-components para UI; **Tailwind** en `className` e iconos **Lucide** salvo excepción acotada y documentada.
- [ ] Se ejecutó el **Protocolo de Cierre Obligatorio (§0.2)** — `FIFER_XRAY_REPORT.md` (fecha si aplica), X-Rays locales **regenerados con `npm run docs:sync --prefix fifer-landing`** (sin edición manual), **`src/modules/system/_xray_INTEGRATIONS.md`** / **`_xray_INTEGRATIONS.md`** si aplica, `_xray_PROTOCOL_SHELL.md` si aplica.
- [ ] **§0.2 — Integrations Audit:** Si el código **involucró APIs externas**, el mapa de integraciones fue **validado** y, si el estado de alguna conexión cambió, el archivo quedó **actualizado de inmediato**.
- [ ] **§12.4 — AI Performance Log:** Si hubo **generación de video o texto** con un modelo concreto, anotación **sutil** en **`src/modules/ai/_xray_AI_MODELS.md`** cuando aporte señal de eficiencia o fracaso para esa rama (p. ej. *«Claude 3.5 Sonnet: excelente en refactorización de CSS»*).
- [ ] **§0.2 — v0 Pack:** Si se actualizó **cualquier** fuente espejada hacia **`v0_pack/`** (01–13), **`npm run v0-sync`** ejecutado en verde; la carpeta de despacho no queda desfasada.
- [ ] **§0.5:** Si se tocaron rutas, esquemas o autosanación, diff mental cumplido y X-Rays / índice actualizados; **footer** *Auditoría X-Ray · Última sincronización* presente y fecha coherente donde se editó documentación.
- [ ] **§0.0:** Si la tarea afecta topología o rutas de módulos, **`npm run xray:validate`** ejecutado y en verde (o índice/disco corregidos antes de cerrar).
- [ ] **§11 (Ley de Procreación):** Nuevo módulo/app: **`_xray_v0_local.md`** desde **`src/templates/`** **antes** de código funcional; **`FIFER_XRAY_REPORT.md`** con ruta nueva y **En Desarrollo**; pack **`module.config.ts` + `_xray_v0_local.md` + `index.ts`** (manifiesto base conforme al Protocolo Shell, o equivalente documentado).
- [ ] **§12 (Ley de Pureza de ADN):** **`_xray_USER_DNA.md`** ≤ **1000** líneas; resumen ejecutivo (no diario); tras **limpieza/compresión** del ADN, **`npm run v0-sync`** en verde (**§12.3**); finanzas en mocks/DB, ADN solo interpretación.

## §10. LEY UNIVERSAL DE AUTO-ACTUALIZACIÓN (Eternity Protocol)

1. **Sincronía obligatoria:** La documentación (X-Rays) es **código**. No se acepta código sin su correspondiente actualización de ADN en el X-Ray.

2. **Eficiencia de créditos (Sniper Mode):**
   - **PROHIBIDO** re-escanear archivos no modificados.
   - **PROHIBIDO** el uso de modelos Pro para tareas de *boilerplate*.
   - El **AI Director** debe priorizar modelos **Flash** para documentar cambios.

3. **Auto-healing de contexto:** Si la IA detecta una contradicción entre un X-Ray y el código, su **prioridad #1** es **corregir el X-Ray** antes de continuar con la tarea del usuario.

## §11. PROTOCOLO DE SCAFFOLDING ORGÁNICO (Ley de Procreación)

**Regla de oro:** **PROHIBIDO** entregar código **«sin alma»** — es decir, sin **X-Ray** (ADN documental) alineado al producto. Ningún módulo, app o micro-frontend es válido si solo existe código funcional sin su **`_xray_v0_local.md`**.

### Trigger de creación

Ante la orden de **crear un nuevo módulo, app o micro-frontend**, la IA **TIENE PROHIBIDO** escribir **código funcional** sin antes generar su **`_xray_v0_local.md`** basado en la plantilla de **`src/templates/`** (`xray-module-template.md`: sustituir marcadores, enlazar MASTER / PROTOCOL_SHELL, footer de auditoría). El ADN es el **primer** entregable; el código útil viene después.

### Auto-registro

**Inmediatamente después** de crear el X-Ray local, la IA **DEBE** actualizar **`FIFER_XRAY_REPORT.md`**, agregando la **nueva ruta** y marcando el estado como **En Desarrollo**. Subir también **«Última sincronización índice»** (**YYYY-MM-DD**) y ejecutar **`npm run xray:validate`** cuando aplique (**§0.0**).

### Pack base

Cada nuevo módulo debe nacer con su **`module.config.ts`**, su **`_xray_v0_local.md`** y un **`index.ts`** que exporte el **manifiesto base** conforme al **Protocolo Shell** (`_xray_PROTOCOL_SHELL.md`, `BoxProps`, registro en `fifer-landing/src/modules/index.ts` cuando el módulo viva bajo `fifer-landing/src/modules/<módulo>/`). Si el paquete está fuera de ese árbol, adaptar rutas manteniendo el mismo **orden**: X-Ray → índice global → código.

**Relación:** complementa **§4** (plantilla en `src/templates/`) y **§10** (sincronía documentación ↔ código).

## §12. LEY DE PUREZA DE ADN (Ley de la Síntesis)

**Objetivo:** que **`src/modules/user/_xray_USER_DNA.md`** sea un **resumen ejecutivo** vivo — **denso, accionable y bajo techo** — no un diario ni un volcado de contexto.

### 12.1 Prohibido el logging infinito

- **`_xray_USER_DNA.md` es un resumen ejecutivo, no un diario.** **Nunca** debe exceder las **1000 líneas**. La IA **DEBE** **comprimir** información antigua (compresión semántica): consolidar lo viejo o redundante en **una sola línea** bajo **`Lecciones Aprendidas`** (o equivalente explícito en el mismo archivo), sin historial de conversaciones ni bitácoras largas.
- **PROHIBIDO** usar el ADN como repositorio de logs crudos, dumps de chat o listados que deban vivir en stores, auditoría o telemetría.

### 12.2 Separación de dominios

- **Datos financieros** (transacciones, ledger, saldos, series temporales) viven en **sus propios mocks, stores o base de datos** (p. ej. `useFinanceStore`, APIs de finanzas, tablas Supabase). **No** se copian listados completos de movimientos dentro del ADN.
- El ADN **solo** conserva la **interpretación** o el **sesgo** derivado de esos datos: p. ej. *«A Cristobal le preocupa el flujo de caja los lunes»*, prioridades de revisión o tono — no los números fila a fila salvo una **mínima anotación** consciente y acotada si aporta contexto estable.

### 12.3 Mantenimiento del espejo (v0_pack)

- Cada vez que se **limpie o comprima** el ADN canónico (`_xray_USER_DNA.md`) — ya sea por el **Conserje** (`src/utils/dna-distiller.ts`) o por edición manual de compresión — **el espejo hacia v0 debe quedar fresco.** El script **`npm run v0-sync`** (`src/utils/v0-mirror.ts`) **DEBE** ejecutarse en el **mismo cierre de flujo** (o inmediatamente después) para regenerar **`v0_pack/10_USER_DNA.md`** (versión destilada) y el resto del paquete **01–13**.
- El **Conserje** dispara **`v0-sync` automáticamente** tras una limpieza que **modifique** el archivo en disco; si la limpieza es **solo manual** (sin script), la IA **DEBE** ejecutar **`npm run v0-sync`** desde la **raíz del repo** antes de dar la tarea por cerrada (**§0.2**, **§8**).

### 12.4 Registro de rendimiento de modelos (AI Performance Log)

- **`src/modules/ai/_xray_AI_MODELS.md`** no es un diario exhaustivo: es el **currículum / benchmark** de modelos (véase tabla y especialización allí).
- Si una tarea implicó **generación de video o texto** (o asistencia equivalente vía modelo) y el resultado fue **exitoso o fallido**, la IA **DEBE** añadir **sutilmente** una anotación breve cuando aporte señal sobre si el modelo fue **eficiente** para **esa rama** de trabajo (p. ej. *«Claude 3.5 Sonnet: excelente en refactorización de CSS»*; *«Veo: buen realismo en textura madera; latencia alta»*). Evitar párrafos largos: **una línea** o viñeta corta en la sección de mantenimiento o matriz del archivo, sin duplicar telemetría cruda.

**Relación:** **Dual-Memory Controller** (`fifer-landing/src/utils/ai-director.ts`); **DNA Distiller** / Conserje (`src/utils/dna-distiller.ts`); **espejo v0** (`src/utils/v0-mirror.ts`, `v0_pack/`).