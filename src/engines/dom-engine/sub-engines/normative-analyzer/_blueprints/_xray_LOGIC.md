# Plano LOGIC — `dom-engine:normative-analyzer`

## UBICACIÓN LÓGICA

`FIFER://SUB_ENGINE/dom-engine/normative-analyzer`

**targetAppOrEngine:** `dom-engine:normative-analyzer`

## Reflejo de código

| Detalle | Implementación |
|---------|----------------|
| IA | `EngineRegistry.use('external-bridge-engine').buildProxy(vault).resolveKey('OPENAI_API_KEY' \| 'ANTHROPIC_API_KEY')` |
| MOCK | Ambas claves MOCK → `buildMockCabidaResponse` (éxito simulado) |
| PROD | OpenAI `chat/completions` JSON; fallback Anthropic `messages` |
| Contratos | `DomAnalisisRequest` / `DomAnalisisResponse` (`src/types/schemas.ts`) |
