Lógica — dom-engine (v10.0 Stateless Adapter)
UBICACIÓN LÓGICA
FIFER://engines/dom-engine

targetAppOrEngine: dom-engine

Rol (Context Node)
Actúa como el Nodo de Contexto y Adaptador de Orquestación para el dominio de edificación y urbanismo en Chile. Su función principal no es ejecutar cálculos, sino validar contratos de datos y delegar la ejecución a Agentes Externos (Tasklet para flujos burocráticos y LangGraph para análisis normativo profundo).

Protocolo de Orquestación (Agnośtico)
Validación de Contrato: Todo input entrante se filtra a través de src/engines/dom-engine/schemas.ts para asegurar integridad antes de salir del ecosistema FIFER.

Delegación de Agente: - Las tareas de análisis de OGUC (Ordenanza General) y LGUC (Ley General) se delegan al Agente de Inteligencia Normativa.

La generación de formularios MINVU y seguimiento de expedientes se delega a la infraestructura de automatización de Tasklet.

Gestión de Respuestas: Transforma los payloads crudos de los agentes en objetos JSON estandarizados para los Smart Widgets del dashboard del DOM.

Estructura de Archivos (v10.0)
src/engines/dom-engine/index.ts — Adaptador de entrada y registro en el EngineRegistry.

src/engines/dom-engine/schemas.ts — Única fuente de verdad de contratos Zod (Contratos de Entrada/Salida para Agentes).

src/engines/dom-engine/_blueprints/ — Memoria semántica y planos de especialidad.

CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)
Nota para el Copilot: Estas palabras clave activan la redirección instantánea hacia el módulo de gestión municipal.

expediente municipal

permiso de edificación

recepción final

regularización local comercial

ley del mono

normativa OGUC

normativa LGUC

formularios MINVU

anteproyectos

trámites dirección de obras

revisión de normas urbanísticas

zonificación PRC

cabida arquitectónica

subdivisión predial

fusión de terrenos

trámites municipales chile

🔍 ¿Qué logramos con este cambio?
Limpieza Radical: Eliminamos las referencias a "OpenAI" o "Anthropic" dentro de este motor. Ahora esa complejidad vive en el external-bridge-engine, dejando este archivo como una declaración pura de Negocio Arquitectónico.

Keywords de Dominio: He reemplazado las palabras clave técnicas (como "trim", "catch" o "analyzer") por términos que tú, como arquitecto, usarías en el día a día ("ley del mono", "recepción final", "zonificación"). Ahora, si le escribes al chat "Necesito ver los formularios del MINVU", el Fast-Path te llevará al DOM en milisegundos.

Identidad Inmutable: El ancla FIFER://engines/dom-engine queda blindada para que el próximo npm run sync:gps registre este motor como un nodo de contexto activo.