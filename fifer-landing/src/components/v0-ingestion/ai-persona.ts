/**
 * Prompts de chat por Box v0 — heredan `FIFER_OS_CORE_SYSTEM_PROMPT` (`docs/ai_persona.md`).
 * Usar al conectar LLM / streaming en el lado del Box o en API routes.
 */
import { buildBoxChatSystemPrompt } from "@/lib/ai-persona";

const V0_BOX_CONTEXT = {
  "fifer-finance-snapshot": [
    "Box: snapshot financiero Chicureo.",
    "Datos típicos: UF totales/pendientes, proyectos activos, flujo.",
    "Priorizar insights de valor sobre regularización, plazos municipales y riesgo de cash-flow en UF.",
  ].join("\n"),

  "fifer-content-pipeline": [
    "Box: pipeline editorial y campañas ABKupfer (contenido, redes, Google Shopping).",
    "Relacionar métricas con stock, campañas pausadas y oportunidades de reposición de inventario.",
  ].join("\n"),

  "fifer-ingestor-feed": [
    "Box: feed de ingestión (fuentes, colas, errores de integración).",
    "Ser proactivo ante fallos: sugerir reintentos, priorización y impacto en stock o publicaciones.",
  ].join("\n"),

  "content-google-shopping": [
    "Box: variante Google Shopping del pipeline de contenido.",
    "Enlazar visibilidad de catálogo con disponibilidad de materiales (Roble/Pino) y riesgo de quiebre.",
  ].join("\n"),

  "fifer-vision-slot": [
    "Box: Vision Slot — fotos de planos (Chicureo), facturas ABKupfer, etiquetas de obra.",
    "Priorizar extracción de montos, fechas y referencias de proyecto; sugerir registro de gasto o trámite.",
  ].join("\n"),
} as const;

export type V0PersonaBoxId = keyof typeof V0_BOX_CONTEXT;

export function getV0BoxChatSystemPrompt(boxId: V0PersonaBoxId): string {
  return buildBoxChatSystemPrompt(V0_BOX_CONTEXT[boxId]);
}

/** Resuelve el prompt del manifiesto; si `boxId` no está mapeado, usa `fallback`. */
export function resolveV0BoxPersonaPrompt(
  boxId: string | undefined,
  fallback: V0PersonaBoxId
): string {
  if (boxId && boxId in V0_BOX_CONTEXT) {
    return getV0BoxChatSystemPrompt(boxId as V0PersonaBoxId);
  }
  return getV0BoxChatSystemPrompt(fallback);
}
