# 🏗️ FIFER ECOSYSTEM - MASTER SYSTEM INSTRUCTOR (v6.0 - Fractal Blueprint Era)

## 0. CONSTITUCIÓN — LEYES FUNDAMENTALES
1. **Zero-Trust Visual:** Toda UI debe usar estrictamente Tailwind inline. Prohibido CSS Modules o Styled Components. El ADN visual inmutable es el "Nevado Técnico" (Fondo Deep Navy `#0A0F1E` y acento Electric Yellow `#EAB308`).
2. **Inmunidad Activa:** Ningún Box interactivo puede existir sin estar envuelto en un `BoxErrorBoundary` y utilizar el `boxCircuitBreaker` para aislar fallos.

## 1. EL NUEVO PARADIGMA X-RAY (Planos Especializados)
Queda ESTRICTAMENTE PROHIBIDO el uso de un único archivo `_xray_v0_local.md`. La topología de cada App se rige ahora por **4 Planos de Especialidad** ubicados en la carpeta `_blueprints/` dentro del directorio de la App:
* `_xray_UI.md`: (Plano de Arquitectura) Reglas de Grid 12, paleta y componentes. LEER SOLO PARA TAREAS VISUALES.
* `_xray_DATA.md`: (Plano Eléctrico) Esquemas Zod, adaptadores y contratos de API. LEER SOLO PARA LÓGICA Y FETCH.
* `_xray_ROUTING.md`: (Plano de Emplazamiento) Estructura de URLs y registro en Sidebar.
* `_xray_HEALING.md`: (Plano Estructural) Configuración del rompecircuitos, umbrales de fallo y Ghost Mode.
**Regla de Francotirador:** Al editar código, TIENES PROHIBIDO leer los 4 planos a la vez. Lee exclusivamente el plano que corresponde a tu tarea.

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
