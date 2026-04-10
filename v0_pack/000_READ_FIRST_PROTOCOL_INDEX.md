**⚠️ PROTOCOLO DE PRIORIDAD ZERO: NO PROCESAR EL RESTO DE ARCHIVOS SIN CONSULTAR ESTE ÍNDICE**

# FIFER Token Gatekeeper Index

## MAPA DE ENRUTAMIENTO

- `[00_PROMPT_MAESTRO_V6_1.md / 00_PROMPT_MAESTRO_V6_3.md]`: Leyes de implementación y lógica de IA avanzada.
- `[01_REPORT_MAESTRO.md]`: Estructura de reportes y salida de datos.
- `[02_MASTER_STYLE.md]`: Reglas de Chasis, Layout y Grid de 12 columnas.
- `[03_PROTOCOL_SHELL.md]`: Contratos de Cajas, estados de error y carga (`isRefining`).
- `[04_INTEGRATIONS_HEALTH.md / 11_INTEGRATIONS_STATUS.md]`: Seguridad, Vault y salud de APIs externas.
- `[05_LOCAL_FINANCE.md, 06_LOCAL_CONTENT.md, 07_LOCAL_AFFILIATES.md]`: Lógica específica de Finanzas, Contenido y Afiliados.
- `[08_STYLEGUIDE_TOKENS.md]`: ADN Visual, colores exactos (Navy/Yellow) y radios.
- `[09_AI_PERSONA.md]`: Tono de voz y personalidad de los agentes.
- `[10_USER_DNA.md]`: Perfil del usuario y preferencias personalizadas.
- `[12_AI_BENCHMARKS.md]`: Comparativa de modelos (GPT, Claude, Gemini).
- `[13_FRONTEND_BLUEPRINT.md]`: Mapa de rutas y estructura de carpetas frontend.
- `[DNA_RULES_SNAPSHOT.md]`: Espejo legible de `.cursorrules` (NotebookLM / Drive; mantener al día con **§0.12**).
- `[99_SYNC_REPORT.md]`: Bitácora de sincronización (motores, `boxId`, estado de gobernanza).

## INSTRUCCIÓN DE COMPORTAMIENTO PARA LA IA

"Cuando el usuario suba esta carpeta, SOLO lee este archivo INDEX. Identifica qué archivos son estrictamente necesarios para la tarea solicitada y pide permiso para leerlos. Si la tarea es visual, no leas la lógica de backend. Si es de datos, no leas el Styleguide. AHORRA TOKENS."

## FIFER_DNA_SEED

UI: Grid12, #0A0F1E/#EAB308, r:0.75rem, gap:gap-4, side:280/80, z:40/50/60, resp:1|6|12, tailwind-only(no CSS modules/CSS-in-JS), biomeVars(--fifer-primary/--fifer-accent/--fifer-deep-navy).  
LOGIC: DualStage(isRefining->Success), JIT-Hydration(BoxLoader->getV0BoxLoader), StateFlow(idle|loading|error|ghost|locked|drag), ErrorIso(BoxErrorBoundary->DiscoveryBox), CircuitBreaker(threshold->open->heal), Ghost(no-data/fetch/jit-fail), WalletGate(aiBlocked->TopUp), CatalogGap(dev banner).  
SEC: Proxy(Vault->Provider), NoClientKeys, AIVault.resolveKey(provider,userId?) -> BYOK(TODO DB) else ENV(FIFER_ADMIN_OPENAI_KEY|LEONARDO|ELEVENLABS) else VaultError(missing_key), ai-proxy zod-guard + payload object-only + provider allowlist + error redaction([redacted], strip sk-/Bearer/env names).  
MODS: Fin(UF/Chicureo, biome:#059669/#D97706, slots:main|stats), Cont(ABKupfer, biome:#1E3A5F/#2563EB, slots:main|gallery), Aff(Comms, biome:#EAB308/#2563EB, slots:hero|stats|main-content).

## 🤖 PROTOCOLO DE INTERACCIÓN (SISTEMA DE CICLO)

Roles del ciclo de trabajo cuando `v0_pack` vive en Drive / NotebookLM:

| Rol | Nombre en el ciclo | Función |
|-----|-------------------|---------|
| **Gemini** | Arquitecto / Estratega | Diseña el plan, prioriza lecturas del pack y redacta prompts ejecutables (un bloque a la vez). |
| **Cursor** | Constructor / Ejecutor | Aplica cambios en el repo, shell y registries; cierra con protocolo de documentación (incl. `99_SYNC_REPORT.md` y `DNA_RULES_SNAPSHOT.md` cuando toque normativa). |
| **Usuario** | Puente de sincronización | Transporta contexto entre herramientas: pega prompts, devuelve resultados y mantiene el pack en Drive alineado al repo. |

### 1. Gemini (Arquitecto / Estratega)
- **Fase de análisis:** Al recibir la carpeta `v0_pack`, mapear la estructura de Engines y Apps.
- **Fase de propuesta:** Presentar una solución técnica antes de pedir código en el IDE.
- **Fase de ejecución iterativa:** Entregar **un** prompt a la vez para Cursor.
- **Fase de cierre:** Sugerir siguientes pasos y, si aplica, un *Master Prompt de Reinicio* para un chat nuevo (destilar progreso y ahorrar tokens).

### 2. Cursor (Constructor / Ejecutor)
- Ejecutar los prompts técnicos con precisión quirúrgica.
- Seguir el ADN de Gobernanza (**§0.11**), reflejado también en [`DNA_RULES_SNAPSHOT.md`](DNA_RULES_SNAPSHOT.md) (espejo legible de `.cursorrules`).

### 3. Usuario (Puente de sincronización)
- Canal entre Gemini, Cursor y el almacenamiento externo: **Gemini entrega → Usuario pega en Cursor → Cursor ejecuta → Usuario resume éxito/error a Gemini** y actualiza el pack en Drive cuando cambie la normativa o la bitácora de sync.