# Plano de Datos — Normativa DOM

## Esquemas Zod (`src/types/schemas.ts`)

- **`domAnalisisRequestSchema`:** `superficieTerreno` (número positivo), `coeficienteConstructibilidad` (positivo), `ocupacionSuelo` (0–100), `destino` (string 1–120 caracteres).
- **`domAnalisisResponseSchema`:** `factible` (boolean), `superficieMaximaEdificable` (number), `observaciones` (string o array de strings).

## API

- **`POST /api/v1/dom/analisis`** (`src/app/api/v1/dom/analisis/route.ts`): valida el cuerpo con `domAnalisisRequestSchema`; exige sesión Supabase y fila `User` en Prisma; construye un `CoreProfile` desde el usuario; invoca **`EngineRegistry.use('ai-fallback')`** (`AiFallbackCascadeEngine.processInsight`) con prompt de sistema de auditor OGUC/LGUC y meta `moduleId: dom-normativa`, `boxId: analisis-parametrico`; la salida textual del modelo se parsea a JSON y se valida con `domAnalisisResponseSchema`. Errores de cascada: `503` con `AiCascadeExhaustedError`; fallo de parseo o esquema: `502`.

## Cliente

- **`page.tsx`** envía el payload JSON desde **`AnalisisTerrenoForm.tsx`** (React Hook Form + `zodResolver(domAnalisisRequestSchema)`); **`ReporteFactibilidad.tsx`** muestra la respuesta tipada o mensajes de error.
