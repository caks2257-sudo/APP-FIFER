# Espejo X-Ray — Comunicación interna (Apps ↔ Engines)

**Clase de documento:** inventario vivo de flujos autorizados entre **Apps** (UI / Next.js) y **Engines** (lógica / APIs), gobernado por `InternalApiKey` en `prisma/schema.prisma`.

**Regla de conflicto:** Si el código o las rutas reales divergen de este archivo, debe actualizarse este espejo **o** revertirse el cambio de arquitectura. La ley de Control de Flujo en `.cursorrules` exige llave válida **y** registro aquí antes de considerar el flujo aprobado para implementación.

**Normativa:** Ninguna App debe invocar un Engine sin una `InternalApiKey` emitida para el `ownerId` correcto, con `targetAppOrEngine` coincidente con el motor llamado, y `scope` acorde a la operación (`READ_ONLY` vs `FULL_ACCESS`).

---

## 1. Modelo mental

```text
[ App / caller mainApp + subApp ]  --Authorization: InternalApiKey-->  [ Engine targetAppOrEngine ]
           |                                                                  |
           +------------------------ ownerId (User) --------------------------+
```

- **caller:** normalmente una App (`mainApp` = slug de dashboard) o un Engine que actúa como cliente de otro Engine (documentar ambos extremos en la tabla inferior).
- **targetAppOrEngine:** identificador estable del motor o app destino (convención: slug en minúsculas, alineado a carpeta bajo `src/engines/` o registro en `EngineRegistry`).

---

## 2. Matriz de flujos registrados

| Origen (App / Engine) | Destino (Engine) | Alcance (`scope`) | Nivel / notas | Estado |
|------------------------|------------------|-------------------|---------------|--------|
| `dom` (App) | `documents` (ejemplo) | `READ_ONLY` | Key Nivel 2 — solo lectura de metadatos / estados | *Plantilla — sustituir por filas reales al cablear* |
| `dom` (App) | `documents` (ejemplo) | `FULL_ACCESS` | Key Nivel 2 — indexación o mutación vía motor | *Plantilla* |
| *…* | *…* | *…* | *…* | *pendiente* |

**Cómo usar la tabla:** cada fila debe corresponder a una fila (o política explícita) de `InternalApiKey` con `name` humano, `apiKey` secreto en almacenamiento, y `targetAppOrEngine` igual al slug del motor.

---

## 3. Convenciones operativas

1. **Headers / secreto:** no documentar el valor de `apiKey` en Markdown; solo el `name`, orígenes, destino y `scope`.
2. **Rotación:** al rotar una llave, actualizar la fila en la base y anotar fecha en columna notas (o en `_xray_HEALING.md` del motor si aplica).
3. **Motores sin UI:** siguen siendo destinatarios `targetAppOrEngine`; las Apps nunca importan rutas físicas del motor (`.cursorrules` §5).
4. **Sub-engines:** registrar el destino como `padre:hijo` si el registro operativo usa esa nomenclatura fractal.

---

## 4. Motor de comunicación (`InternalApiManager`)

Implementación: `src/lib/api-manager.ts` (servidor; usa `supabaseAdmin`).

### Emitir una llave (admin / onboarding / panel interno)

Tras resolver el `ownerId` del usuario (p. ej. vía sesión o lookup en `User`), crea la fila y conserva el secreto **solo** donde corresponda (env cifrado, gestor de secretos, nunca en el cliente ni en Markdown).

```ts
import {
  generateInternalKey,
  type InternalApiKeyScope,
} from '@/lib/api-manager'

const { id, apiKey } = await generateInternalKey({
  ownerId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
  targetAppOrEngine: 'normativa',
  name: 'DOM → motor normativa (validación de archivo)',
  scope: 'FULL_ACCESS' satisfies InternalApiKeyScope,
})
// Guardar `apiKey` de forma segura; no volverá a mostrarse desde la API.
```

### Validar en el Engine destino (Route Handler / Server Action)

El motor que recibe la petición conoce su propio slug (`calleeTargetAppOrEngine`). Debe coincidir con `targetAppOrEngine` de la fila en base de datos.

```ts
import {
  validateInternalRequest,
  type InternalApiKeyScope,
} from '@/lib/api-manager'

// Ej.: header Authorization: Bearer <apiKey> o cabecera dedicada
const apiKey = request.headers.get('x-fifer-internal-key')

const auth = await validateInternalRequest(
  apiKey,
  'FULL_ACCESS' satisfies InternalApiKeyScope,
  'normativa',
)

if (!auth.ok) {
  return new Response('Unauthorized', { status: 401 })
}

// Trazabilidad ADN: el responsable del flujo es auth.ownerId
const ownerIdParaAuditoria = auth.ownerId
// Opcional: auth.keyId, auth.name, auth.scope (sin exponer el secreto)
```

### Reglas que aplica `validateInternalRequest`

| Comprobación | Comportamiento |
|--------------|----------------|
| Llave ausente / vacía | `reason: 'MISSING_KEY'` |
| Sin fila en `InternalApiKey` | `reason: 'NOT_FOUND'` |
| `targetAppOrEngine` ≠ slug del servicio llamado | `reason: 'TARGET_MISMATCH'` |
| `scope` insuficiente (`READ_ONLY` no cubre operaciones que exigen `FULL_ACCESS`) | `reason: 'INSUFFICIENT_SCOPE'` |

En validación exitosa se emite un log estructurado en servidor (`keyId`, `ownerId`, `targetAppOrEngine`, `scope`, timestamp) **sin** imprimir el valor de `apiKey`.

### Uso por objeto (opcional)

```ts
import { InternalApiManager } from '@/lib/api-manager'

await InternalApiManager.generateInternalKey({ ... })
await InternalApiManager.validateInternalRequest(apiKey, 'READ_ONLY', 'documents')
```

---

## 5. Referencias cruzadas

- Esquema: `prisma/schema.prisma` (`InternalApiKey`, `InternalApiKeyScope`).
- Servicio: `src/lib/api-manager.ts` (`generateInternalKey`, `validateInternalRequest`).
- Espejo global de tablas: `prisma/_xray_DATABASE_GLOBAL.md`.
- Kit de arranque (App vs Engine): `docs/blueprints/STARTER_KIT_UNIVERSAL.md`.
