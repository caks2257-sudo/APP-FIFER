/** Contrato de motor IA — catálogo semilla, Supabase y scoring compartidos. */

export type AiEngineUnitType = "tokens" | "images" | "seconds" | "characters";

export interface IAiEngine {
  id: string;
  name: string;
  provider: string;
  description: string;
  specialty: string;
  /** Coste unitario base antes de margen FIFER (USD por 1K tokens, imagen, etc.). */
  costPerUnit: number;
  unitType: AiEngineUnitType;
  ranking: {
    general: number;
    taskSpecific: Record<string, number>;
  };
  /** Opcional: ventana de contexto desde metadatos del proveedor. */
  contextWindowTokens?: number;
}
