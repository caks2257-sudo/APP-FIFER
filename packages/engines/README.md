# ⚙️ FIFER Engines Layer
Esta capa contiene la lógica de negocio pura, agnóstica de UI. Ningún motor aquí puede importar nada de `apps/` ni de `fifer-landing`.

- `@fifer/auth-engine`: Gestión de sesiones y Supabase Auth.
- `@fifer/database-engine`: Conexiones, migraciones y caché.
- `@fifer/finance-engine`: Flujos de caja, UF, cálculos matemáticos.
- `@fifer/legal-rules-engine`: Evaluador de normativas de urbanismo y arquitectura (OGUC, LGUC).
- `@fifer/scraping-engine`: Extracción de datos y sincronización de catálogos.
- `@fifer/llm-engine`: Orquestación de IA (Dual-Stage Pipeline, Prompts).
