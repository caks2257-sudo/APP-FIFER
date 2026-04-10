/**
 * Contexto profesional y base ABKupfer para `ContentEngine`.
 * Sincronizado conceptualmente con `v0_pack/10_USER_DNA.md` y datos demo en
 * `fifer-landing/src/mocks/content-data.ts` (sin importar el landing desde el core).
 */
import { FIFER_DEFAULT_USER_DNA } from "./user-dna-defaults";

/** Evita duplicar el bloque en prompts encadenados (execute tras refine). */
export const FIFER_PROFESSIONAL_CONTEXT_MARKER = "[FIFER · Contexto Profesional · User DNA]" as const;

/**
 * Bioma de mensajes de sistema: Esmeralda (Chicureo/finanzas) · Yellow (acento FIFER) · Navy (lienzo) · azul editorial (contenido).
 * Alineado a `v0_pack/000_READ_FIRST_PROTOCOL_INDEX.md`.
 */
export const FIFER_SYSTEM_BIOMA_LINE =
  "Bioma: Esmeralda (#059669) — Chicureo/finanzas; Electric Yellow (#EAB308) — acento/CTA; Deep Navy (#0A0F1E) — superficie; Azul editorial (#1E3A5F / #2563EB) — pipeline contenido ABKupfer." as const;

/**
 * Tipologías y SKUs demo ABKupfer (mismos nombres que `contentMockData.inventory` en `fifer-landing/src/mocks/content-data.ts`).
 * Líneas m²/caja coherentes con `AbkupferProductType` / `ABKUPFER_M2_PER_BOX` en `fifer-landing/src/utils/converters.ts`.
 */
export const ABKUPFER_CONTENT_KNOWLEDGE_BASE = {
  brand: "ABKupfer.cl",
  inventorySkus: ["Piso Ingeniería Roble Europeo", "Cladding Pino Termotratado"] as const,
  categories: ["piso-madera (ingeniería Roble)", "revestimiento / cladding (Pino termotratado)"] as const,
  packagingRef: [
    "Roble ingeniería — referencia ~2,1 m²/caja",
    "Pino / cladding — referencia ~2,35 m²/caja",
  ] as const,
} as const;

export function buildProfessionalContextBlock(): string {
  const dna = FIFER_DEFAULT_USER_DNA;
  const skus = ABKUPFER_CONTENT_KNOWLEDGE_BASE.inventorySkus.join("; ");
  return [
    FIFER_PROFESSIONAL_CONTEXT_MARKER,
    FIFER_SYSTEM_BIOMA_LINE,
    `Perfil operador: ${dna.identityName} — ${dna.roles.join(" · ")}.`,
    `Pilares: ${dna.pillars.join(" · ")}.`,
    `Territorio de confianza: ${dna.territory} — obras, regularización municipal, proyectos inmobiliarios.`,
    `Tono obligatorio: técnico y arquitectónico; enfatizar plusvalía y marco normativo/legal en Chile (Chicureo) cuando aplique.`,
    `Idioma: ${dna.locale}.`,
    `Marca / canal: ${ABKUPFER_CONTENT_KNOWLEDGE_BASE.brand}. Inventario demo (denominaciones): ${skus}.`,
    `Categorías: ${ABKUPFER_CONTENT_KNOWLEDGE_BASE.categories.join(" · ")}.`,
    `Referencia empaque (no inventar cifras nuevas): ${ABKUPFER_CONTENT_KNOWLEDGE_BASE.packagingRef.join(" · ")}.`,
    "En descripciones de contenido, usar solo estas líneas y SKUs conocidos; no inventar productos ni precios.",
  ].join("\n");
}

/** Antepone el contexto profesional a cada ejecución si aún no está presente. */
export function withProfessionalContext(text: string): string {
  const t = text.trim();
  if (!t) return buildProfessionalContextBlock();
  if (t.includes(FIFER_PROFESSIONAL_CONTEXT_MARKER)) return t;
  return `${buildProfessionalContextBlock()}\n\n${t}`;
}
