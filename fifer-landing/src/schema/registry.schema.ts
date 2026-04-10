import { z } from "zod";

/** Color hex (#RGB o #RRGGBB) — bioma / tokens de módulo. */
export const HexColorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Debe ser un color hexadecimal (#RGB o #RRGGBB)");

/** Fase 1 — span estricto de grid (1..12). */
export const GridSpanSchema = z.number().int().min(1, "Grid span ≥ 1").max(12, "Grid span ≤ 12");

/** Grid layout para manifiestos de Box (runtime validator). */
export const GridLayoutSchema = z.object({
  minWidth: GridSpanSchema,
  minHeight: GridSpanSchema,
  isResizable: z.boolean().optional(),
}).strict();

/**
 * Manifiesto de Box — validación estricta de registro (BoxLoader / catálogo).
 * `boxId`: kebab-case estable (clave en layout y registry).
 */
export const BoxManifestSchema = z.object({
  boxId: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "boxId: kebab-case (letras minúsculas, números, guiones)"),
  sourceModule: z.string().min(1, "sourceModule requerido"),
  targetSlot: z.string().min(1, "targetSlot requerido"),
  layout: GridLayoutSchema,
  propsSchema: z
    .object({
      type: z.literal("object"),
      required: z.array(z.string().min(1)),
      properties: z.record(z.string(), z.object({ type: z.string().min(1) })),
    })
    .optional(),
  themeOverrides: z.record(z.string(), HexColorSchema).optional(),
  permissions: z.array(z.string().min(1)).optional(),
}).strict();

/**
 * Ruta de módulo: path absoluto de segmento, slots por nombre → lista de boxId permitidos, roles opcionales.
 */
export const ModuleRouteSchema = z.object({
  path: z
    .string()
    .min(1)
    .refine((p) => p.startsWith("/"), "path debe empezar por /"),
  /** Nombre de slot → ids de Box que pueden anclarse. */
  slots: z.record(z.string().min(1), z.array(z.string().min(1))),
  /** Roles Supabase / app requeridos para ver esta ruta (vacío = sin restricción extra). */
  rolesRequired: z.array(z.string().min(1)).default([]),
});

/** Fase 1 — configuración mínima estricta para módulo (Core Registry). */
export const ModuleConfigSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "id de módulo: kebab-case"),
  biomePrimary: HexColorSchema,
  biomeAccent: HexColorSchema,
}).strict();

/**
 * Configuración extendida de módulo usada hoy por el dashboard.
 * Conserva compatibilidad con `module.config.ts` existentes.
 */
export const ModuleConfigRegistrySchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "id de módulo: kebab-case"),
  nombre: z.string().min(1),
  icono: z.string().min(1),
  /** Bioma visual (primary, accent, surface, onPrimary, …). */
  biome: z.record(z.string(), HexColorSchema).optional(),
  /** Alias histórico compatible con `@/types/architecture` — mismos valores hex que `biome`. */
  themeOverrides: z.record(z.string(), HexColorSchema).optional(),
  routes: z.array(ModuleRouteSchema).min(1, "Al menos una ruta"),
}).strict();

/** Tipos inferidos — Core Registry Fase 1 */
export type BoxManifest = z.infer<typeof BoxManifestSchema>;
export type GridSpan = z.infer<typeof GridSpanSchema>;
export type GridLayout = z.infer<typeof GridLayoutSchema>;
export type ModuleRoute = z.infer<typeof ModuleRouteSchema>;
export type ModuleConfig = z.infer<typeof ModuleConfigSchema>;
export type ModuleConfigRegistry = z.infer<typeof ModuleConfigRegistrySchema>;

// --- Fase 4 — Contrato JIT `BoxProps.data` (`toBoxPropsData` / `FiferBoxDataNormalized`) ---

const BoxDataSourceSchema = z.enum([
  "finance",
  "shopify",
  "mercadolibre",
  "affiliates",
  "generic",
  "ai",
  "google_ads",
]);

const SeriesPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

const DiscoveryFieldTraceSchema = z.object({
  sourceKey: z.string(),
  canonical: z.enum([
    "title",
    "label",
    "name",
    "value",
    "amount",
    "address",
    "owner",
    "status",
    "currency",
    "email",
    "phone",
    "date",
    "id",
  ]),
  score: z.number(),
});

const FiferBoxDataMetaSchema = z.object({
  degraded: z.boolean().optional(),
  reason: z.string().optional(),
  validationErrors: z.array(z.string()).optional(),
  sourceHint: z.string().optional(),
  ghostMode: z.boolean().optional(),
});

/**
 * Capa normalizada sola (`utils/adapters/types` — `FiferBoxDataNormalized`).
 */
export const FiferBoxDataNormalizedSchema = z.object({
  source: BoxDataSourceSchema,
  title: z.string().optional(),
  series: z.array(SeriesPointSchema).optional(),
  metrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  canonicalRecords: z
    .array(z.record(z.string(), z.union([z.string(), z.number()])))
    .optional(),
  discoveryTrace: z.array(DiscoveryFieldTraceSchema).optional(),
  raw: z.unknown().optional(),
  meta: FiferBoxDataMetaSchema.optional(),
});

/**
 * Payload estándar en `BoxProps.data`: spread de la capa normalizada + `normalized` (espejo).
 * Validar mocks y semillas JIT con esto — falla en carga si el contrato no coincide.
 */
export const StandardBoxDataSchema = FiferBoxDataNormalizedSchema.extend({
  normalized: FiferBoxDataNormalizedSchema,
});

export type FiferBoxDataLayer = z.infer<typeof FiferBoxDataNormalizedSchema>;
export type StandardBoxData = z.infer<typeof StandardBoxDataSchema>;

/** Parse seguro — devuelve datos tipados o error Zod. */
export function parseBoxManifest(input: unknown) {
  return BoxManifestSchema.safeParse(input);
}

export function parseModuleRoute(input: unknown) {
  return ModuleRouteSchema.safeParse(input);
}

export function parseModuleConfig(input: unknown) {
  return ModuleConfigSchema.safeParse(input);
}

export function parseModuleConfigRegistry(input: unknown) {
  return ModuleConfigRegistrySchema.safeParse(input);
}

export function parseStandardBoxData(input: unknown) {
  return StandardBoxDataSchema.safeParse(input);
}
