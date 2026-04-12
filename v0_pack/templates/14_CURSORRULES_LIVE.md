<!-- Espejo vivo — generado automáticamente (2026-04-12T01:39:16.910Z) — fuente: .cursorrules — no editar a mano -->

# 🏗️ FIFER ECOSYSTEM - MASTER SYSTEM INSTRUCTOR (v6.3 — Observabilidad Total + Salud Arquitectónica)

## 0. CONSTITUCIÓN — LEYES FUNDAMENTALES
1. **Zero-Trust Visual:** Toda UI debe usar estrictamente Tailwind inline. Prohibido CSS Modules o Styled Components. El ADN visual inmutable es el "Nevado Técnico" (Fondo Deep Navy `#0A0F1E` y acento Electric Yellow `#EAB308`).
2. **Inmunidad Activa:** Ningún Box interactivo puede existir sin estar envuelto en un `BoxErrorBoundary` y utilizar el `boxCircuitBreaker` para aislar fallos.
3. **PROTECCIÓN DE ENTORNO (.env):**
   * El archivo `.env` se considera un "Archivo Protegido de Nivel 0".
   * Queda ESTRICTAMENTE PROHIBIDO que Cursor modifique, purgue, limpie o altere el archivo `.env` de forma autónoma durante procesos de refactorización o "auto-sanación".
   * Cursor solo podrá interactuar con el `.env` bajo una ORDEN DIRECTA Y EXPLÍCITA del usuario (ej: "Agrega la Key de Eleven Labs al .env").
   * En caso de duda, Cursor debe preguntar antes de realizar cualquier cambio en este archivo.
   * **Escritura programática (solo desarrollo):** la única superficie de código autorizada para leer/escribir el `.env` físico es el Sub-Engine `system-engine:env-manager`, y solo cuando `NODE_ENV === 'development'`. Cualquier otra ruta debe rechazarse en tiempo de ejecución.

## 1. EL NUEVO PARADIGMA X-RAY (Planos Especializados)

### Directiva obligatoria — espejo X-Ray en tiempo real (`_xray_*.md`)

> Toda creación o modificación de un archivo X-Ray (`_xray_*.md`), ya sea una actualización de los que ya existen o una categoría completamente distinta, DEBE ser siempre un espejo X-Ray en tiempo real que refleje fielmente el código y las conexiones de la aplicación. Queda estrictamente prohibida la escritura descriptiva, estática o el uso de plantillas desconectadas de la realidad del código.

**PROTOCOLO DE ESPEJO UNIVERSAL:** Está estrictamente prohibido crear X-rays de texto simple o meramente narrativos. Todo X-ray (Database, Logic, UI, Comms, Location, Routing, Healing, Contract, Data) debe ser un **Espejo Técnico**: documentación verificable frente al código y al esquema. Antes de dar por terminada una tarea, el Agente debe comprobar que el X-ray refleje la realidad exacta del código (nombres de tablas y modelos Prisma, rutas, tipos, scopes, políticas RLS donde aplique).

**REGLA DE ANCLA LÓGICA:** Todo módulo (App, Sub-App, Engine, Sub-Engine) debe incluir en **al menos un** plano bajo su `_blueprints/` la cabecera `## UBICACIÓN LÓGICA` seguida de su dirección `` `FIFER://...` ``. Esa ancla es la identidad inmutable del módulo en el ecosistema y debe coincidir con la entrada generada en `docs/registry/LOCATION_MAP.json` tras ejecutar la sincronización GPS.

Queda ESTRICTAMENTE PROHIBIDO el uso de un único archivo `_xray_v0_local.md`. La topología de cada App se rige ahora por **5 Planos de Especialidad** ubicados en la carpeta `_blueprints/` dentro del directorio de la App:
* `_xray_UI.md`: (Plano de Arquitectura) Reglas de Grid 12, paleta y componentes. LEER SOLO PARA TAREAS VISUALES.
* `_xray_DATA.md`: (Plano Eléctrico) Esquemas Zod, adaptadores y contratos de API. LEER SOLO PARA LÓGICA Y FETCH.
* `_xray_ROUTING.md`: (Plano de Emplazamiento) Estructura de URLs y registro en Sidebar.
* `_xray_HEALING.md`: (Plano Estructural) Configuración del rompecircuitos, umbrales de fallo y Ghost Mode.
* `_xray_DATABASE.md`: (Plano de Persistencia Nativa) SCHEMA Prisma, RLS Supabase e historial de MIGRATIONS — véase **§8**.
**Regla de Francotirador:** Al editar código, TIENES PROHIBIDO leer los 5 planos a la vez. Lee exclusivamente el plano que corresponde a tu tarea.

## 2. SEPARACIÓN DEL ADN (Gobernanza de Usuario)
El "ADN" ya NO es un archivo Markdown para que el programador lo lea (`_xray_USER_DNA.md` queda obsoleto como contexto de desarrollo). 
* **El ADN es para el Usuario:** Las preferencias (Core Profile y Fractal DNA) se gestionarán estrictamente en Base de Datos / Stores y se inyectarán vía API para que la App recomiende contenido.
* **Prohibición:** No utilices tokens de IA intentando leer historiales de usuario para programar componentes.

## 3. PROTOCOLO DE CREACIÓN (Scaffolding Engine)
Queda ESTRICTAMENTE PROHIBIDO crear aplicaciones, módulos o X-Rays a mano.
* Toda nueva App debe nacer ejecutando el comando estructurado de scaffolding (ej. `npm run fifer:create-app`).
* Este motor es el único autorizado para generar la carpeta `_blueprints/` y registrar la App en el ecosistema.

## 4. PROTOCOLO DE CIERRE Y VISIBILIDAD
Tras cualquier cambio estructural, debes ejecutar el script de sincronización (`npm run v0-sync` o equivalente) para asegurar que la carpeta `v0_pack/` mantenga una copia actualizada en tiempo real de todos los planos y configuraciones maestras para uso del usuario.
* **Estructura modular `v0_pack/`:** Los artefactos viven en `v0_pack/ui-kit/` (primitivos UI), `v0_pack/blocks/` (bloques compuestos) y `v0_pack/templates/` (plantillas de página y espejos maestros; p. ej. `14_CURSORRULES_LIVE.md`).
* **v0.dev — ingesta:** Cualquier nuevo componente exportado de v0.dev debe guardarse en `v0_pack/` en la subcarpeta que corresponda, con un **nombre descriptivo**, **antes** de integrarlo al árbol `src/`.

## 5. ENGINE CORE PROTOCOL (Backend Architecture & Motores)
Queda ESTRICTAMENTE PROHIBIDO acoplar la lógica de negocio (Motores) directamente a las vistas (Apps). Todo motor operará bajo las siguientes leyes:

1. **Aislamiento Micro-Core:** Los motores vivirán en carpetas aisladas (ej. `src/engines/`). Las Apps NUNCA deben importarlos directamente mediante sus rutas físicas. Toda comunicación se hará a través del `EngineRegistry`.
2. **Planos del Motor (Engine Blueprints):** Todo motor debe contener una subcarpeta `_blueprints/` con:
   * `_xray_CONTRACT.md`: Define el contrato Zod de Entrada/Salida (Cómo se comunica con FIFER).
   * `_xray_LOGIC.md`: Documenta el funcionamiento interno y dependencias.
   * `_xray_HEALING.md`: Documenta la resiliencia y el **AI Fallback Cascade** (La estrategia de salto automático entre proveedores como OpenAI, Anthropic o Google si uno falla).
   * `_xray_DATABASE.md`: Si el motor requiere persistencia propia (o para documentar **N/A** y enlace al esquema compartido), SCHEMA Prisma, RLS y migraciones — **§8**.
3. **Auto-Sanación Activa:** Ningún motor puede carecer de un bloque `try/catch` global que derive los errores al circuito de inmunidad.
4. **Auto-Regeneración Legacy:** Si el `Engine Auditor` detecta un motor antiguo sin sus planos, NO debe limitarse a lanzar un error; debe ejecutar un protocolo de ingeniería inversa para auto-generar los planos faltantes sin alterar el código existente.
5. **Sub-Engines (Topología Fractal):** Las modificaciones o alteraciones de un motor principal no deben sobreescribir el Core. Deben crearse como "Sub-Motores" dentro de la carpeta del padre (ej. `src/engines/[padre]/sub-engines/[hijo]/`). Cada sub-motor es una entidad aislada que DEBE tener sus propios `_blueprints/` e inmunidad, y se registrará en el ecosistema bajo la nomenclatura `padre:hijo`.
6. **Tier-Aware FinOps (Cascadas Financieras):** Todo motor que consuma APIs de pago (Especialmente el AI Fallback Cascade) TIENE PROHIBIDO usar una cascada estática. Debe recibir el `CoreProfile` (Nivel del usuario: Gratuito vs Pago) para determinar la ruta. Usuarios gratuitos harán cascada SÓLO entre APIs abiertas/gratuitas. Usuarios de pago iniciarán en la mejor API de pago, y solo usarán gratuitas como rescate.
7. **Control de Flujo (Internal API Keys):** Ninguna App puede solicitar datos a un Engine sin una `InternalApiKey` válida (modelo Prisma `InternalApiKey`: `ownerId`, `scope`, `targetAppOrEngine`) **y** registro del flujo en el Espejo de Comunicación (`docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`). Las rutas de API internas deben validar la llave antes de ejecutar lógica del motor.
8. **Sistema de Engines intercomunicados:** Toda nueva función o modificación de una existente debe tratarse como creación o edición de un Engine o Sub-Engine. Los motores deben estar intercomunicados (contratos, `EngineRegistry`, rutas internas documentadas) y registrados en el sistema X-Ray de forma automática: anclas `## UBICACIÓN LÓGICA` + `` `FIFER://...` ``, planos completos bajo `_blueprints/`, regeneración de `docs/registry/LOCATION_MAP.json` con `npm run sync:gps`, y reflejo de flujos en `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md` cuando exista llamada cruzada.
9. **Nuevo concepto arquitectónico → X-Ray y propagación:** Si una modificación introduce un nuevo concepto arquitectónico, debe integrarse de inmediato como plano X-Ray (categoría nueva o ampliación verificable) y propagarse a todo el sistema, incluyendo `docs/blueprints/STARTER_KIT_UNIVERSAL.md` y plantillas bajo `v0_pack/templates/`.

## 6. MASTER APPS & SYSTEM GOVERNANCE (Administración)
Las aplicaciones de nivel "Master" (como la App Desarrollador) tienen privilegios y reglas especiales:

1. **Acceso Restringido (Admin-Only):** Toda Master App debe validar el `role: 'admin'` en el `CoreProfile` del ADN antes de renderizar cualquier dato. Si el rol no es admin, se debe redirigir al dashboard general.
2. **Kit de Construcción Estándar (Standard Issue):** Queda ESTRICTAMENTE PROHIBIDO crear una App sin el `SmartInsightWidget`. El Scaffolder de Apps debe incluirlo por defecto en el shell de la página, pre-configurado con el `moduleId` correspondiente.
3. **FinOps Transparente:** Las reglas de Tier (Free vs Pro) deben estar centralizadas en el Motor de IA. Las Apps no deciden la cascada; solo envían el `CoreProfile` y el motor ejecuta la ruta financiera correspondiente.
4. **Protocolo de Observabilidad:** Todo motor o sub-motor nuevo debe exponer un método o propiedad de "Health Status" que pueda ser consultado por el registro central para el monitoreo en tiempo real.
5. **ADN de Permisos (Access Tiers):** Toda aplicación debe estar clasificada en uno de estos niveles:
   - `public`: Acceso total sin restricciones.
   - `free`: Requiere login básico.
   - `pro`: Requiere `tier: 'pro'` en el CoreProfile.
   - `admin`: Requiere `role: 'admin'` en el CoreProfile.
   - `user-custom`: Apps creadas por usuarios (sección "Mis Apps").
6. **Registro Obligatorio (App Manifest):** Queda prohibido el hard-coding de enlaces en la Sidebar. Toda App debe estar inscrita en `src/registry/app-registry.ts` para ser visible.
7. **Integración Nativa de Layout (Dashboard Group):** Toda nueva aplicación DEBE crearse obligatoriamente dentro del grupo de rutas `(dashboard)`. Queda prohibido crear aplicaciones fuera de `src/app/(dashboard)/` a menos que sea una página de login o landing externa. Esto garantiza que hereden automáticamente la Sidebar, el Header y el sistema de autenticación de FIFER.

## 8. PERSISTENCIA NATIVA (Supabase & Prisma)
- **Blueprints de Datos Obligatorios:** Toda app/engine debe incluir `_xray_DATABASE.md` en su carpeta `_blueprints/`.
- **Contenido del Blueprint:** Debe definir el `SCHEMA` de Prisma, las reglas `RLS` (Row Level Security) de Supabase y el historial de `MIGRATIONS`.
- **Aislamiento:** Está prohibido el SQL manual; toda interacción debe ser vía Prisma Client centralizado.

## 9. TRAZABILIDAD Y CONTEXTO UNIVERSAL (Cross-App Context — ADN FIFER)
- **Regla de aplicación cabecera (`mainApp`):** Toda entidad creada por un usuario (Bots, Documentos, Contratos, etc.) DEBE incluir un campo `mainApp` (String) que identifica la App FIFER de primer nivel que originó el registro (ej. `misbots`, `contratos`, `dom`).
- **Regla de sub-contexto (`subApp`):** Opcional (String nullable); refina el módulo o flujo dentro de la misma `mainApp` cuando aplique.
- **Regla de extensión (`metadata`):** Opcional (`Json` / JSONB); payload estructurado acordado por negocio sin sustituir columnas first-class.
- **Regla de Pertenencia (`ownerId`):** Toda entidad interactiva DEBE estar vinculada a un `ownerId` (referencia al User ID de Supabase Auth / tabla `User`).
- **Documentación API & X-Ray:** Toda ruta de API que comparta o consuma datos entre aplicaciones debe validar coherencia de `mainApp` (y `subApp` si el contrato lo exige). Los blueprints `_xray_DATABASE.md` (Espejos técnicos) deben reflejar `ownerId`, `mainApp`, `subApp` y `metadata` según `prisma/schema.prisma`.

## 10. COORDENADAS LÓGICAS — GPS ACTIVO E INDEPENDENCIA DE RUTA
1. **Fuente de verdad:** El mapa canónico de rutas físicas ↔ identidad lógica del ecosistema es `docs/registry/LOCATION_MAP.json` (direcciones `FIFER://...`). El archivo es un **subproducto automático**: no debe mantenerse a mano.
2. **REGLA DE GPS ACTIVO:** Antes de cualquier **refactorización, renombrado o movimiento** de carpetas que afecte a Apps, Sub-Apps, Engines o Sub-Engines, el Agente **DEBE** ejecutar la sincronización GPS desde la raíz del repo: `npm run sync:gps` (implementación: `npx ts-node scripts/sync-gps.ts` con las mismas opciones de compilación que el resto de scripts TS del proyecto, o el alias npm equivalente). El script escanea `src/`, lee las anclas `## UBICACIÓN LÓGICA` en los X-rays bajo `_blueprints/` y reescribe `LOCATION_MAP.json` para que el mapa refleje la ubicación real de las anclas.
3. **Obligatorio antes de importar o mover:** Antes de un **import** que asuma una ruta estable, o de **mover/renombrar** un módulo anclado, consulta `LOCATION_MAP.json` **después** de haber ejecutado el GPS si acabas de cambiar el árbol de carpetas.
4. **Coherencia X-ray ↔ mapa:** Toda ancla `FIFER://...` en un plano local debe corresponder a una entrada del mapa generada por el script; los tipos `APP`, `SUB_APP`, `ENGINE` y `SUB_ENGINE` los asigna el sincronizador según la ruta física del módulo.

## 11. LEY DE SINCRONIZACIÓN RETROACTIVA (ADN evolutivo global)

### 11.1 LEY DE EVOLUCIÓN GLOBAL
**LEY DE EVOLUCIÓN GLOBAL:** Ante cualquier cambio en los patrones arquitectónicos (ADN), sistema X-Ray o estándares de UI, Cursor tiene la obligación de **ESCANEAR** y **ACTUALIZAR** todas las Apps y Engines existentes. Está **PROHIBIDO** mantener código «Legacy» que no cumpla con la versión más reciente del ADN registrado en `.cursorrules` (y su espejo `v0_pack/templates/14_CURSORRULES_LIVE.md`).

### 11.2 Hub & Spoke (Apps principales y sub-apps)
- **Hub (App principal):** aplicación de producto de primer nivel bajo `src/app/(dashboard)/<slug>/` con entrada en `src/registry/app-registry.ts`, responsable del shell de experiencia y del `mainApp` por defecto en datos que origine.
- **Spoke (Sub-App):** segmentos anidados bajo el mismo árbol de rutas (tipo GPS `SUB_APP`) que refinan el dominio; deben documentarse en `_xray_ROUTING.md` y alinearse con `subApp` en persistencia cuando aplique.
- Los espejos globales `prisma/_xray_DATABASE_GLOBAL.md` y `docs/blueprints/_xray_UI_GLOBAL.md` describen esta jerarquía; cada App debe reflejarla en sus planos locales.

### 11.3 PROTOCOLO DE AUTO-HEALING EVOLUTIVO (GPS + compliance)
El script `npm run sync:gps` (`scripts/sync-gps.ts`) y los procesos de **Auto-Healing** del ecosistema deben validar **no solo** la ubicación y unicidad de las anclas GPS, sino la **compliance** con el ADN vigente: planos obligatorios bajo `_blueprints/`, coherencia de tipos de módulo (`APP` / `SUB_APP` / `ENGINE` / `SUB_ENGINE`), presencia de **Hub** documentado para cada App de producto (ruta raíz del módulo + registro), y estándar de Sub-Engines (carpeta `sub-engines/`, planos, registro). Si una App no tiene declarado su rol de Hub en los planos o un Sub-Engine incumple el estándar, el sistema debe **marcarlo** para **refactorización inmediata** (deuda bloqueante hasta alinear). La norma operativa detallada vive en `docs/blueprints/AUTO_HEALING_COMPLIANCE.md`.

## 12. LEY DE ORQUESTACIÓN EXTERNA (External Bridge Engine)

1. **Centralización vía Bridge Engine:** Toda integración con proveedores externos (pagos, facturación, banca abierta, etc.) se resuelve **exclusivamente** a través del motor `external-bridge-engine` y su `BridgeProxy`. Las Apps y rutas de producto **no** leen ni inyectan claves de API de terceros de forma directa en componentes o hooks de UI.
2. **Proxy seguro para API Keys:** Las variables sensibles (`FLOW_API_KEY`, `FINTOC_SECRET_KEY`, `STRIPE_SECRET_KEY`, etc.) viven en el plano servidor (`.env` y/o credenciales cifradas en base de datos vía API de sistema). El cliente solo consume **estado agregado** (p. ej. MOCK vs PROD) y formularios de rotación bajo rol admin; nunca el valor en claro de la llave.
3. **Fallback automático a mocks:** Si una clave está ausente, vacía o coincide con el marcador de plantilla `INSERT_KEY_HERE`, el Bridge Engine **debe** operar en modo MOCK devolviendo datos de prueba coherentes y deterministas para desarrollo y demos, sin llamar a redes externas con credenciales inválidas.
4. **Propagación ADN:** Nuevo patrón de orquestación externa → actualizar `docs/blueprints/_xray_EXTERNAL_BRIDGE.md`, el Starter Kit (`docs/blueprints/STARTER_KIT_UNIVERSAL.md`, `v0_pack/templates/`) y ejecutar `npm run sync:gps` para anclas GPS del motor.

## 13. INTERNACIONALIZACIÓN (i18n — texto de producto)

1. **Fuente única de copy:** Todo texto estático en la UI debe residir en archivos de diccionario (`messages/<locale>.json` o namespaces acordados). Queda estrictamente prohibido el hard-coding de strings de interfaz en componentes (salvo identificadores técnicos, claves de telemetría o datos dinámicos del backend sin alternativa).
2. **Motor:** El ecosistema usa `next-intl` alineado con App Router; locales soportados y prefijos de URL se definen en `src/i18n/routing.ts`. Enlaces y navegación deben usar `@/i18n/navigation` (`Link`, `useRouter`, `redirect`) para conservar el locale activo.
3. **Nuevas Apps:** Toda App creada con el scaffolding debe añadir sus claves bajo un namespace estable en `messages/es-CL.json` y `messages/en-US.json` (o split por archivo si el equipo lo define en `docs/blueprints/_xray_I18N.md`) y documentar el namespace en `_xray_ROUTING.md` o `_xray_UI.md`.

## 14. LEY DE SOBERANÍA DE CONEXIONES (Gestión unificada de secretos e integraciones)

1. **Macro-Pilares obligatorios (taxonomía única):** Toda conexión externa debe clasificarse en **exactamente una** de estas cinco familias y registrarse en el External Bridge / hub con el mismo identificador de categoría que el motor (`BridgeConnectionCategory`): **INTELIGENCIA_ARTIFICIAL**, **FINANZAS_PAGOS**, **ECOMMERCE**, **INFRAESTRUCTURA**, **REDES_SOCIALES**.
2. **Auto-Descubrimiento (mapeo dinámico):** El sistema debe mapear dinámicamente cualquier variable del `.env` a estos Macro-Pilares según **prefijos y patrones** reconocidos por `describeDiscoveredKey` / `discoverIntegrationsFromEnv` en `external-bridge-engine` (p. ej. `OPENAI_`, `ANTHROPIC_` → INTELIGENCIA_ARTIFICIAL; `STRIPE_`, `FLOW_`, `FINTOC_` → FINANZAS_PAGOS; `SHOPIFY_`, `ALI_`, `WOOCOMMERCE_` → ECOMMERCE; `SUPABASE_`, `VERCEL_` → INFRAESTRUCTURA; `FB_`, `META_`, `INSTAGRAM_` → REDES_SOCIALES). El mapa canónico de prefijos vive en `docs/blueprints/_xray_EXTERNAL_BRIDGE.md` y debe mantenerse alineado al código.
3. **Soporte Multi-Key:** Las conexiones complejas (p. ej. **Supabase**) se tratan como **una sola entidad lógica con múltiples llaves** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, variantes `NEXT_PUBLIC_*`) dentro del **mismo Box** de integración: comparten `groupId` / `groupLabel` en el estado unificado y en la UI del hub.
4. **Agrupación Multi-Key obligatoria:** Cuando una integración externa requiere múltiples variables (ej. Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, etc.), el motor de descubrimiento **DEBE** agruparlas bajo un mismo `groupId`. La interfaz UI **DEBE** renderizar todas estas llaves dentro de un único Box contenedor, nunca en cajas separadas.
5. **Soberanía de edición:** Las llaves y secretos son **editables solo en localhost** (`hostname` localhost o 127.0.0.1) y con el servidor en modo desarrollo donde aplique. En **producción**, la UI de gestión de conexiones es **solo lectura y monitoreo** (sin rotación vía HTTP desde el despliegue público).
6. **Mock-First:** Toda nueva conexión **nace en modo simulación** hasta que un Admin inyecte la llave real (entorno seguro o variable de despliegue); el Bridge Engine continúa aplicando `INSERT_KEY_HERE` / vacío como MOCK coherente (véase §12).
7. **Coherencia:** Cualquier ampliación de prefijos, Macro-Pilares o del motor `env-manager` debe reflejarse en `docs/blueprints/_xray_EXTERNAL_BRIDGE.md`, en plantillas `v0_pack/templates/` (incl. `SNAPSHOT_useExternalBridge.md`) y ejecutar `npm run sync:gps` para anclas GPS del motor.

## 15. ORDENAMIENTO FÍSICO DEL ADN (`.env` — bloques por Macro-Pilar)

1. **Formato obligatorio de bloques:** El archivo `.env` debe mantenerse **estrictamente organizado** por bloques de comentarios con el formato: `# === [NOMBRE_DEL_MACRO_PILAR] ===`, usando los nombres: `INTELIGENCIA ARTIFICIAL`, `FINANZAS & PAGOS`, `E-COMMERCE`, `INFRAESTRUCTURA`, `REDES SOCIALES` (espacios y ampersand según se muestra; coherente con la taxonomía §14).
2. **Prohibición de llaves huérfanas:** Queda **prohibido** dejar variables de integración **fuera** de estos bloques cuando se edita el `.env` en un contexto autorizado (véase Constitución §0, punto 3: sin modificaciones autónomas no solicitadas). Si se detecta una nueva integración o una variable suelta, el agente debe **moverla físicamente** al bloque del Macro-Pilar que corresponda **sin alterar el valor** de la variable.
3. **Superficie de escritura:** La reorganización física por bloques en disco queda acotada a la misma política que la Constitución §0, punto 3, y el Sub-Engine `env-manager`: **orden explícito del usuario** o `system-engine:env-manager` con `NODE_ENV=development`. El Auto-Healing y los agentes no reordenan el `.env` sin ese marco.

## 16. MONITOREO DE SALUD Y MICRO-MÉTRICAS (Sala de Guerra — Apps de Sistema)

1. **Vista obligatoria:** Toda **App de Sistema** (p. ej. Desarrollador) debe incluir una **Sala de Guerra** (Health Dashboard) que monitoree, como mínimo: **latencia de APIs externas** (sondas vía `external-bridge-engine` / Bridge), **estado de motores internos** (`system-health` + `EngineRegistry`), y **registros de seguridad / auditoría del Sub-Engine `env-manager`** (lecturas/escrituras `.env` en desarrollo, sin exponer secretos).
2. **Observabilidad:** La Sala de Guerra debe consumir las APIs de agregación existentes (`/api/v1/war-room`, `system-health`) y mantener el tema visual **Nevado Técnico** (§0).
3. **Propagación:** Nuevas sondas o columnas de la Sala de Guerra deben reflejarse en `docs/blueprints/` y ejecutar `npm run sync:gps` cuando afecten anclas GPS.
4. **Micro-latencia por conexión (APIs externas):** Los **Boxes individuales** de APIs externas **DEBEN** incluir un **micro-indicador de latencia (ms)** específico para esa conexión. Esta métrica se usará a futuro para **enrutamiento dinámico de IA (Fallback Cascade)** (priorización y salto entre proveedores según salud medida).
5. **Cabeceras de telemetría (`TelemetryHeaderBox`):** Las cabeceras de telemetría **DEBEN** mostrar de forma **explícita** tanto el **conteo de elementos `LIVE` / `ONLINE`** como el de **`MOCK` / `OFFLINE`** (no solo un agregado ambiguo).

## 17. SALUD ARQUITECTÓNICA VISUAL (Sala de Guerra — integridad del ADN)

El sistema **DEBE** exponer **visualmente** su propia **integridad estructural** en la **Sala de Guerra**. Esto incluye, como mínimo: **estado de sincronización del X-Ray** (mapa GPS / `LOCATION_MAP.json` y coherencia con anclas `FIFER://...`), **versión actual del ADN** (referencia al ADN maestro `.cursorrules` y su espejo `v0_pack/templates/14_CURSORRULES_LIVE.md`), y el **estado de la matriz de Auto-Healing** (compliance §11.3 / `docs/blueprints/AUTO_HEALING_COMPLIANCE.md`). Los datos de esta capa **DEBEN** ser **consumibles vía API** (p. ej. `/api/v1/system-health/architecture`) para que la UI y futuros paneles operen sobre una fuente única.

## 18. DATA-DRIVEN UI (Telemetría y paneles operativos)

**Regla Data-Driven:** El frontend tiene estrictamente prohibido hardcodear listas de motores, conexiones o métricas. Debe iterar dinámicamente sobre los arrays (Data-Driven UI) generados por los payloads del backend. Si el backend añade una nueva IA o motor, la UI debe renderizarlo automáticamente.

## 19. LAYOUT AUTÓNOMO (Acoplamiento fluido)

**Prohibido el "stretch" vertical forzado** entre componentes de distinta longitud. Los layouts deben usar `items-start` en CSS Grid, o configuraciones Masonry (p. ej. columnas CSS) para que cada caja ocupe estrictamente el alto de su contenido (**Acoplamiento fluido**). No igualar artificialmente la altura de tarjetas vecinas salvo requisito explícito de diseño.

## 20. VISTAS DINÁMICAS Y FALLBACKS (Auto-Healing visual)

Los paneles de datos deben preparar soporte para **múltiples vistas** (Gráfico, Lista, Ping Live). Todo componente de visualización debe implementar **Graceful Degradation**: si un gráfico falla o la data no es compatible, debe mutar automáticamente a un formato de **Lista plana** o **Tabla raw** en lugar de romper el layout (**Auto-Healing visual**).
