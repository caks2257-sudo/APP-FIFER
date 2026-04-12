# Lógica — dom-engine

## UBICACIÓN LÓGICA

`FIFER://engines/dom-engine`

**targetAppOrEngine:** `dom-engine`

## Rol

Contenedor de negocio **DOM** (trámites municipales: recepciones, permisos, regularizaciones). El sub-motor **`dom-engine:normative-analyzer`** calcula / valida **cabida arquitectónica base** a partir de parámetros de terreno, usando IA resuelta por **`external-bridge-engine`** (`BridgeProxy.resolveKey` sobre `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` + vault opcional).

## Flujo normativo

1. API `POST /api/v1/dom/analisis` autentica usuario (Supabase + Prisma).
2. `loadDecryptedVault()` y llamada a `NormativeAnalyzerSubEngine.runAnalysis(input, vault)`.
3. Si ambas claves IA están en **MOCK** (placeholder / vacío), `buildMockCabidaResponse` devuelve análisis **simulado y exitoso** coherente con \(superficie \times coeficiente\).
4. Si hay **PROD** OpenAI, `chat/completions` + `response_format: json_object`; si no, se intenta Anthropic `messages`; si no hay clave válida, MOCK.

## Archivos

- `src/engines/dom-engine/index.ts` — registro `dom-engine`.
- `src/engines/dom-engine/sub-engines/normative-analyzer/analyzer.ts` — núcleo `analyzeNormativeCabida`.
- `src/engines/dom-engine/sub-engines/normative-analyzer/audit-prompt.ts` — prompt OGUC/LGUC.
