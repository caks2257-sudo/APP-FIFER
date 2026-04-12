# Persistencia — `dom-engine:form-generator` + App DOM

## UBICACIÓN LÓGICA

`FIFER://SUB_ENGINE/dom-engine/form-generator`

## Esquema

El sub-motor sigue siendo **puro** (genera JSON); la **persistencia** del borrador generado vive en Prisma bajo el modelo **`DomExpediente`**, escrito desde la ruta API `POST /api/v1/dom/expedientes/generate` y listado con `GET /api/v1/dom/expedientes`.

### Tabla `DomExpediente` (modelo Prisma: `DomExpediente`)

| Columna     | Tipo Prisma | NOTAS |
|------------|-------------|--------|
| `id`       | `String`    | PK `@id @default(cuid())` |
| `userId`   | `String`    | FK → `User.id`, `onDelete: Cascade` |
| `formType` | `String`    | Ej. `minvu-2.1-edificacion` |
| `projectData` | `Json`   | Borrador generado (salida del mapper / motor) |
| `status`   | `String`    | Default `DRAFT`; valores previstos `DRAFT`, `SUBMITTED` |
| `mainApp`  | `String`    | Default `dom` (trazabilidad §9) |
| `subApp`   | `String?`   | Ej. `hub-expediente` cuando el origen es el Hub |
| `metadata` | `Json?`     | Extensión futura |
| `createdAt`| `DateTime`  | |
| `updatedAt`| `DateTime`  | `@updatedAt` |

**Índices:** `@@index([userId])`.

**Relación:** `User.domExpedientes` → `DomExpediente.user`.

### APIs

| Método | Ruta | Uso |
|--------|------|-----|
| `POST` | `/api/v1/dom/expedientes/generate` | Genera borrador vía motor y **crea** fila `DomExpediente` (`status: DRAFT`) |
| `GET` | `/api/v1/dom/expedientes` | Lista expedientes del usuario autenticado, `orderBy: createdAt desc` |

### RLS Supabase

Las políticas RLS siguen el modelo de acceso vía **backend Prisma** (service role / conexión de servidor). Si se expone lectura directa PostgREST, añadir políticas por `auth.uid()` ↔ `userId` en una iteración de endurecimiento.

### Migraciones

Cambios de esquema: `prisma/migrations/` + alineación `supabase/migrations/` si el proyecto duplica DDL.
