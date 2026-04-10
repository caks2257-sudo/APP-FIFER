import type { BoxProps } from "@/types/fifer-box";
import type { FiferBoxDataNormalized } from "@/utils/adapters/types";

/** Asigna al contrato `BoxProps.data` (objeto enriquecido con capa normalizada). */
export function toBoxPropsData(normalized: FiferBoxDataNormalized): BoxProps["data"] {
  return {
    ...normalized,
    normalized,
  };
}
