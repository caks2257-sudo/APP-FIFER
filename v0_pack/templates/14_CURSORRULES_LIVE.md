<!-- Espejo vivo — generado automáticamente (2026-04-13T05:46:27.725Z) — fuente: .cursorrules — no editar a mano -->

# 🏗️ FIFER ECOSYSTEM - MASTER SYSTEM INSTRUCTOR (v7.0 — Integración Centralizada, AODS + Zero Technical Debt)

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
* El alcance íntegro (apps, motores, sub-motores, planos y prohibición de scaffolding manual) está definido en **§21**.

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

## 8. PERSISTENCIA NATIVA Y AUDITORÍA (Supabase & Prisma)
- **Blueprints de Datos Obligatorios:** Toda app/engine debe incluir `_xray_DATABASE.md` en su carpeta `_blueprints/`.
- **Contenido del Blueprint:** Debe definir el `SCHEMA` de Prisma, las reglas `RLS` (Row Level Security) de Supabase y el historial de `MIGRATIONS`.
- **Aislamiento:** Está prohibido el SQL manual; toda interacción debe ser vía Prisma Client centralizado.
- **Auditoría Externa Obligatoria:** Todo dato proveniente de Webhooks o Callbacks externos DEBE registrarse primero en el modelo `IntegrationCallbackEvent` antes de procesar lógica de negocio (Ver §27).

## 9. TRAZABILIDAD Y CONTEXTO UNIVERSAL (Cross-App Context — ADN FIFER)
- **Regla de aplicación cabecera (`mainApp`):** Toda entidad creada por un usuario (Bots, Documentos, Contratos, etc.) DEBE incluir un campo `mainApp` (String) que identifica la App FIFER de primer nivel que originó el registro (ej. `misbots`, `contratos`, `dom`, `finanzas`).
- **Regla de sub-contexto (`subApp`):** Opcional (String nullable); refina el módulo o flujo dentro de la misma `mainApp` cuando aplique.
- **Regla de extensión (`metadata`):** Opcional (`Json` / JSONB); payload estructurado acordado por negocio sin sustituir columnas first-class.
- **Regla de Pertenencia (`ownerId`):** Toda entidad interactiva DEBE estar vinculada a un `ownerId` (referencia al User ID de Supabase Auth / tabla `User`).

## 10. COORDENADAS LÓGICAS — GPS ACTIVO E INDEPENDENCIA DE RUTA
1. **Fuente de verdad:** El mapa canónico de rutas físicas ↔ identidad lógica del ecosistema es `docs/registry/LOCATION_MAP.json` (direcciones `FIFER://...`). El archivo es un **subproducto automático**: no debe mantenerse a mano.
2. **REGLA DE GPS ACTIVO:** Antes de cualquier **refactorización, renombrado o movimiento** de carpetas que afecte a Apps, Sub-Apps, Engines o Sub-Engines, el Agente **DEBE** ejecutar la sincronización GPS desde la raíz del repo: `npm run sync:gps`.
3. **Obligatorio antes de importar o mover:** Antes de un **import** que asuma una ruta estable, o de **mover/renombrar** un módulo anclado, consulta `LOCATION_MAP.json`.

## 11. LEY DE SINCRONIZACIÓN RETROACTIVA (ADN evolutivo global)
Ante cualquier cambio en los patrones arquitectónicos (ADN), sistema X-Ray o estándares de UI, Cursor tiene la obligación de **ESCANEAR** y **ACTUALIZAR** todas las Apps y Engines existentes. Está **PROHIBIDO** mantener código «Legacy».

## 12. LEY DE ORQUESTACIÓN EXTERNA (External Bridge Engine)
1. **Centralización vía Bridge Engine:** Toda comunicación *saliente* con proveedores externos se resuelve **exclusivamente** a través del motor `external-bridge-engine`. Las Apps no inyectan claves de API directamente.
2. **Fallback automático a mocks:** Si una clave está ausente, el Bridge Engine **debe** operar en modo MOCK devolviendo datos de prueba.

## 13. INTERNACIONALIZACIÓN (i18n — texto de producto)
1. **Fuente única de copy:** Todo texto estático en la UI debe residir en archivos de diccionario (`messages/<locale>.json`). Queda estrictamente prohibido el hard-coding de strings de interfaz.
2. **Motor:** El ecosistema usa `next-intl`. Enlaces y navegación deben usar `@/i18n/navigation`.

## 14. LEY DE SOBERANÍA DE CONEXIONES Y AGENTES
1. **Macro-Pilares obligatorios:** Toda conexión externa debe clasificarse en **una** de estas familias: **INTELIGENCIA_ARTIFICIAL** (ej. LangGraph), **FINANZAS_PAGOS** (ej. Fintoc), **ECOMMERCE**, **INFRAESTRUCTURA** (ej. Tasklet, Supabase), **REDES_SOCIALES** (ej. Make).
2. **Auto-Descubrimiento:** El sistema debe mapear dinámicamente cualquier variable del `.env` a estos Macro-Pilares.

## 15. ORDENAMIENTO FÍSICO DEL ADN (`.env` — bloques por Macro-Pilar)
El archivo `.env` debe mantenerse **estrictamente organizado** por bloques de comentarios con el formato: `# === [NOMBRE_DEL_MACRO_PILAR] ===`. Prohibido dejar llaves huérfanas.

## 16. MONITOREO DE SALUD Y MICRO-MÉTRICAS (War Room)
Toda **App de Sistema** debe incluir una **Sala de Guerra** que monitoree: latencia de APIs externas, estado de motores internos, y registros de seguridad. Los Boxes deben incluir micro-indicadores de latencia.

## 17. SALUD ARQUITECTÓNICA VISUAL
El sistema **DEBE** exponer visualmente su propia integridad estructural (estado GPS, versión del ADN, compliance de Auto-Healing) en la Sala de Guerra consumible vía API.

## 18. DATA-DRIVEN UI (Telemetría y paneles operativos)
**Regla Data-Driven:** El frontend tiene prohibido hardcodear listas de motores o conexiones. Debe iterar dinámicamente sobre arrays generados por los payloads del backend.

## 19. LAYOUT AUTÓNOMO (Acoplamiento fluido)
Prohibido el "stretch" vertical forzado. Los layouts deben usar `items-start` para que cada caja ocupe el alto de su contenido.

## 20. VISTAS DINÁMICAS Y FALLBACKS (Auto-Healing visual)
Si un gráfico falla, debe mutar automáticamente a un formato de **Lista plana** en lugar de romper el layout.

## 21. PROTOCOLO DE STARTER KIT OBLIGATORIO
Prohibida la creación manual de carpetas para nuevas aplicaciones. Todo debe nacer a través del motor de scaffolding oficial.

## 22. PRINCIPIO "NACIDO CONECTADO"
Al inicializar un módulo, el agente DEBE asegurar su registro en `EngineRegistry`, su ancla `FIFER://...`, ejecución de GPS y exposición en la Sala de Guerra.

## 23. DEPURACIÓN ESTRICTA Y CÓDIGO MUERTO
Ley de tolerancia cero al código muerto. Eliminar variables sin uso e importaciones huérfanas de inmediato. Rutas antiguas sin `[locale]` deben eliminarse o migrarse.

## 24. PROTOCOLO DE AUTO-HEALING VISUAL
Auditar en cada componente: acoplamiento fluido, Graceful Degradation y Data-Driven obligatorio.

## 25. AODS (ORQUESTADOR AUTÓNOMO DE DESARROLLO CON IA)
Toda lógica del orquestador DEBE residir en `src/engines/ai-orchestrator-engine/`. Prohibido llamadas HTTP directas a APIs de IA; deben enrutarse por el `external-bridge-engine`. El estado DEBE persistirse en PostgreSQL según el esquema AODS.

## 26. PROTOCOLO MAESTRO DE LIMPIEZA — ZERO TECHNICAL DEBT
Toda actualización impulsada por Cursor DEBE incluir proactivamente la eliminación de código muerto, rutas redundantes y sistemas duplicados.

## 27. PROTOCOLO DE INTEGRACIÓN CENTRALIZADA (CALLBACK HUB)
1. **Embudo Único de Entrada:** Queda ESTRICTAMENTE PROHIBIDO crear rutas de API aisladas o independientes para recibir webhooks de servicios externos (ej. `/api/fintoc-webhook` o `/api/tasklet-callback`). TODA comunicación entrante de agentes y plataformas externas (Tasklet, Fintoc, Make, LangGraph) DEBE ingresar exclusivamente por `src/app/api/v1/integrations/callback/route.ts`.
2. **Auditoría Antes que Lógica (Zero-Trust Data):** El Callback Hub tiene la obligación absoluta de registrar el payload entrante íntegro en la tabla `IntegrationCallbackEvent` de Prisma con el estado `processed: false` ANTES de ejecutar cualquier lógica de negocio interna.
3. **Aislamiento de Delegación (Librería de Integraciones):** El archivo `route.ts` del Callback Hub TIENE PROHIBIDO contener lógica de negocio (App Finanzas, App DOM, etc.). Su única función es validar seguridad, auditar y derivar el payload al manejador correspondiente en `src/lib/integrations/[provider].ts` (ej. `fintoc.ts`, `tasklet.ts`).
4. **Cierre de Ciclo de Procesamiento:** Una vez que el manejador específico de la integración concluye su operación en la base de datos (ej. conciliar una transacción), debe devolver el control para que el evento original se marque obligatoriamente como `processed: true` en la tabla de auditoría.