# Lógica y dependencias — AiFallbackCascadeEngine

**Fuente de verdad (LLM):** Este motor es la **única** fuente de verdad para peticiones LLM en FIFER. Reemplaza y depreca el antiguo `utils/ai-director.ts`. Implementa la lógica **Dual-Stage** de forma nativa, gestionando la **cascada de proveedores** en orden: **Gemini → Anthropic → OpenAI** (fallback automático entre proveedores cuando uno falla o no está disponible).

**Estado:** Documentación de cierre v6.0 — alineada con `EngineRegistry` y rutas que delegan en el motor en lugar del director legacy.

Describir flujo principal, módulos internos, imports críticos y efectos secundarios (I/O, red, persistencia) en revisiones posteriores si el detalle operativo lo exige el equipo.
