# Plano de Datos — Perfil profesional

## Esquema Zod (expediente obligatorio)

Definido en `src/types/schemas.ts` como `perfilExpedienteSchema`. Campos **todos requeridos** para conformación de expedientes:

| Campo | Rol |
|--------|-----|
| `nombres` | Nombre(s) de pila; texto recortado, 1–120 caracteres. |
| `apellidoPaterno` | Primer apellido; 1–80 caracteres. |
| `apellidoMaterno` | Segundo apellido; 1–80 caracteres. |
| `nacionalidad` | Nacionalidad declarada; 2–80 caracteres. |
| `fechaNacimiento` | Cadena `AAAA-MM-DD`; fecha pasada, dentro de rango razonable (máx. 120 años). |
| `rut` | RUT chileno con dígito verificador válido (`@/utils/rut-chile`, `isValidRutChile`). |

No se usa un único campo de “nombre completo”; el nombre para mostrar en UI se **deriva** de los tres campos de nombre en `toCoreProfile` (`useUserDnaStore`).

## Formulario React

- `ProfileExpedienteForm` (`src/components/perfil/ProfileExpedienteForm.tsx`): **React Hook Form** + `zodResolver(perfilExpedienteSchema)`.
- Guardado servidor: `POST /api/v1/perfil` con el mismo payload Zod; Prisma `expediente.upsert` por `userId` y actualización de `User.name` compuesto.
- Caché cliente: `updateCoreProfile` en `useUserDnaStore` + `partialize`; `ExpedienteHydrator` llama `GET /api/v1/perfil` tras hidratar `localStorage` para alinear nombres, apellidos, nacionalidad, fecha, RUT y `tier`/`role` con PostgreSQL.

## Persistencia Prisma

- Modelo `Expediente` 1:1 con `User` (`userId` `@unique`, `rut` `@unique`). Columnas: `nombres`, `apellidoPaterno`, `apellidoMaterno`, `nacionalidad`, `fechaNacimiento` (`DateTime` UTC en BD; API expone fecha ISO `AAAA-MM-DD`).
- Cliente singleton: `src/lib/prisma.ts`. Espejo global: `prisma/_xray_DATABASE_GLOBAL.md`.

## Tipos canónicos

- `CoreProfile` / `UserIdentity` en `src/types/user-dna.ts` incluyen `rut: string` junto a nombres y apellidos.
