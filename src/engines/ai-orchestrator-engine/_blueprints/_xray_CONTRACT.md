# Plano CONTRACT — `ai-orchestrator-engine` (AODS)

## UBICACIÓN LÓGICA

`FIFER://ENGINE/AI_ORCHESTRATOR`

## Flujo de estados (sesión)

| Fase | `AodsSession.status` | Descripción |
|------|----------------------|-------------|
| 0 | `INIT` | Se crean `AodsSession`, `AodsState`, primer `AodsMessage` (USER) con el Plan Maestro. |
| 1 | `NOTEBOOK` | Tras generar el documento `NOTEBOOK_PROMPT` (ChatGPT vía `external-bridge-engine` + clave `OPENAI_API_KEY`), se espera input del usuario desde NotebookLM. |
| 2+ | `GEMINI` → `LOOP` → … | Pendiente de implementación (Gemini / loop Cursor). |

## Contratos de entrada/salida (motor)

| Método | Entrada | Salida |
|--------|---------|--------|
| `initSession` | `SessionStartParams`: `ownerId`, `planMaestro` | `InitSessionResult`: `success`, `sessionId`, `message` |
| `generateNotebookPrompt` | `sessionId` (interno tras INIT) | Persiste `AodsDocument` (`NOTEBOOK_PROMPT`), mensaje `CHATGPT`, actualiza `AodsState` y estado `NOTEBOOK`. |

## Dependencias

- **Persistencia:** Prisma — modelos `AodsSession`, `AodsState`, `AodsDocument`, `AodsMessage` (`prisma/schema.prisma`).
- **IA (§25.2):** Credenciales resueltas con `EngineRegistry.use('external-bridge-engine').buildProxy().resolveKey('OPENAI_API_KEY')`; sin llamadas directas que bypass el bridge para la clave.

**Registro:** `EngineRegistry.register('ai-orchestrator-engine', ...)` en `src/engines/ai-orchestrator-engine/index.ts`.
