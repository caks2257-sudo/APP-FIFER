import type { ReactNode } from "react";

/** IDs registrados en `BOX_REGISTRY` (config/box.config.ts). */
export type BoxRegistryId = "stats-overview" | "active-projects";

/**
 * Estados declarativos de una Smart Box (ver box_system.md).
 */
export type BoxState =
  | "idle"
  | "loading"
  | "error"
  | "ghost"
  | "locked"
  | "drag";

/** Nombre alineado con box_system.md; equivalente a {@link BoxState}. */
export type SmartBoxState = BoxState;

/**
 * Props compartidas por todas las Smart Boxes.
 * Las implementaciones pueden añadir campos concretos mediante intersección:
 * `type MyBoxProps = SmartBoxProps & { itemId: string };`
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
  children?: ReactNode;
}
