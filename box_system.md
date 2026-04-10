# Sistema Smart Boxes

Las **Smart Boxes** son módulos de UI con **comportamiento y estados explícitos**, encapsulados en un **SmartBoxShell** que ofrece una superficie uniforme al resto de la aplicación.

---

## 1. Estados de una box

| Estado | Significado | UI típica |
|--------|-------------|-----------|
| `idle` | Lista para interactuar; contenido estable y no bloqueado. | Contenido normal, sin overlays de carga global. |
| `loading` | Esperando datos o preparación del interior (JIT-hydration puede ocurrir aquí). | Skeleton/spinner **dentro del shell**, sin romper el layout del padre. |
| `error` | Fallo recuperable o no; el shell comunica el fallo sin crashear el árbol padre. | Mensaje + acción (reintentar / volver), estados accesibles. |
| `ghost` | Placeholder visual: posición reservada, contenido aún no “real” (p. ej. preview o slot vacío con altura fija). | Silueta o contenido tenue; no confundir con loading con datos. |
| `locked` | Interacción deshabilitada (permisos, plan, feature flag, readonly). | Opacidad / overlay / `pointer-events` según diseño; **no** sustituir por error si es una restricción esperada. |
| `drag` | Modo arrastre activo (reordenación, Kanban, etc.). | Elevación, sombra, z-index; coordenadas pueden requerir excepciones mínimas de estilo dinámico (ver protocolo: Tailwind primero). |

**Nota:** el estado es **declarativo** en props; la box no debe depender de que el padre adivine clases internas.

---

## 2. Anatomía del SmartBoxShell

El shell es un **contenedor único por box** (o variación por tema) compuesto típicamente de:

1. **Raíz semántica** — `section`/`article` con `aria-*` acorde al contenido (título, región viva para errores si aplica).
2. **Header opcional** — título, badges, acciones; no mezclar lógica de negocio pesada (delegar a hooks/box).
3. **Cuerpo** — zona donde el estado `loading` muestra skeleton y `error` el bloque de error; `idle` renderiza el contenido real.
4. **Overlay de `locked`** — capa que bloquea interacción sin ocultar necesariamente el contenido (según diseño).
5. **Capa de `drag`** — cuando el estado es `drag`, estilos de “elevación” y feedback; el DnD vive en componentes cliente acotados.

El **interior** (lista, formulario, gráfico) es intercambiable; el shell **no** conoce detalles de negocio, solo el estado y los slots definidos por props.

---

## 3. Contrato TypeScript — `SmartBoxProps`

Contrato base recomendado para todas las boxes. Las boxes concretas **extienden** esta interfaz con props específicas (p. ej. `userId`, `onSave`).

```typescript
export type SmartBoxState =
  | "idle"
  | "loading"
  | "error"
  | "ghost"
  | "locked"
  | "drag";

/**
 * Props compartidas por todas las Smart Boxes.
 * Las implementaciones pueden añadir campos concretos mediante intersección:
 *   type MyBoxProps = SmartBoxProps & { itemId: string };
 */
export interface SmartBoxProps {
  /** Identificador estable para telemetría, tests y keys. */
  boxId: string;

  /** Estado visual y de interacción declarado por el sistema o la box. */
  state: SmartBoxState;

  /** Texto corto para cabecera o `aria-label` cuando no hay título visual. */
  title?: string;

  /** Mensaje cuando state === "error"; ignorado en otros estados salvo que la box decida mostrarlo. */
  errorMessage?: string;

  /** Cuando true, el shell puede anunciar cambios a lectores de pantalla (p. ej. regiones vivas). */
  announceStatus?: boolean;

  /** Clases Tailwind adicionales en la raíz del shell (sin estilos inline). */
  className?: string;

  /** Contenido principal de la box (Server o Client child según límites JIT). */
  children?: React.ReactNode;
}
```

### Directrices de implementación

- **`state` es la fuente de verdad** para qué renderiza el shell; no duplicar con booleanos redundantes (`isLoading` + `state`) salvo migración gradual documentada.
- **Children** representan el contenido en `idle`; en `loading`/`error` el shell puede ignorar children o mostrarlos en modo degradado según política de la box (documentar en la box concreta).
- **Extensión:** `export type KanbanColumnProps = SmartBoxProps & { columnId: string; onMove: (id: string) => void };`

---

## 4. Relación con el resto del sistema

- El mapa de carpetas está en `frontend_architecture.md` (`/boxes` por feature).
- Las reglas de hidratación, Tailwind y Biome están en `000_read_first_protocol.md`.
