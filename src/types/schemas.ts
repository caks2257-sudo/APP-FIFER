import { z } from 'zod';

/** Estado comercial canónico de un proyecto inmobiliario (BDUI DashboardInmobiliario). */
export const inmobiliarioEstadoSchema = z.enum(['Disponible', 'En construcción', 'Comercialización', 'Agotado']);

export type InmobiliarioEstado = z.infer<typeof inmobiliarioEstadoSchema>;

export const InmobiliarioPropiedadSchema = z.object({
  id: z.string().min(1),
  nombreProyecto: z.string().min(1),
  unidadesDisponibles: z.number().int().nonnegative(),
  estado: inmobiliarioEstadoSchema,
});

export type InmobiliarioPropiedad = z.infer<typeof InmobiliarioPropiedadSchema>;

/**
 * Payload BDUI inmobiliario: lista de propiedades + metadatos opcionales (degradación §0.25).
 * `InmobiliarioDataSchema` en sentido de “shape de datos del módulo” = este objeto.
 */
export const InmobiliarioDataSchema = z.object({
  schemaVersion: z.string().optional(),
  propiedades: z.array(InmobiliarioPropiedadSchema).default([]),
  degraded: z.boolean().optional(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
});

export type InmobiliarioDataPayload = z.infer<typeof InmobiliarioDataSchema>;

/** Estado operativo de un bot en el cockpit Mis Bots. */
export const botEstadoSchema = z.enum(['activo', 'pausado']);

export type BotEstado = z.infer<typeof botEstadoSchema>;

export const BotRowSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  estado: botEstadoSchema,
  modeloAsignado: z.string().min(1),
  costoPromedioUF: z.number().nonnegative(),
  /** Avatar opcional (URL https o data URI desde bridge / generación). */
  avatarUrl: z.string().optional(),
});

export type BotRow = z.infer<typeof BotRowSchema>;

/**
 * Payload BDUI Mis Bots: arreglo `bots` + metadatos y degradación §0.25.
 */
export const BotDataSchema = z.object({
  schemaVersion: z.string().optional(),
  bots: z.array(BotRowSchema).default([]),
  degraded: z.boolean().optional(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
});

export type BotDataPayload = z.infer<typeof BotDataSchema>;
