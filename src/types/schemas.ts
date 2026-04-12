import { z } from 'zod';

import { isValidRutChile } from '@/utils/rut-chile';

/** Expediente de identidad — conformación obligatoria (perfil / trámites). */
export const perfilExpedienteSchema = z.object({
  nombres: z
    .string()
    .trim()
    .min(1, { message: 'Los nombres son obligatorios' })
    .max(120, { message: 'Máximo 120 caracteres' }),
  apellidoPaterno: z
    .string()
    .trim()
    .min(1, { message: 'El apellido paterno es obligatorio' })
    .max(80, { message: 'Máximo 80 caracteres' }),
  apellidoMaterno: z
    .string()
    .trim()
    .min(1, { message: 'El apellido materno es obligatorio' })
    .max(80, { message: 'Máximo 80 caracteres' }),
  nacionalidad: z
    .string()
    .trim()
    .min(2, { message: 'La nacionalidad es obligatoria' })
    .max(80, { message: 'Máximo 80 caracteres' }),
  fechaNacimiento: z
    .string()
    .min(1, { message: 'La fecha de nacimiento es obligatoria' })
    .refine(
      (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00`)),
      { message: 'Use una fecha válida (AAAA-MM-DD)' },
    )
    .refine((s) => {
      const d = new Date(`${s}T12:00:00`);
      const now = new Date();
      return d < now;
    }, { message: 'La fecha debe ser anterior a hoy' })
    .refine((s) => {
      const d = new Date(`${s}T12:00:00`);
      const min = new Date();
      min.setFullYear(min.getFullYear() - 120);
      return d >= min;
    }, { message: 'Fecha fuera de rango razonable' }),
  rut: z
    .string()
    .trim()
    .min(1, { message: 'El RUT es obligatorio' })
    .refine(isValidRutChile, { message: 'RUT inválido (verifique dígito verificador)' }),
});

export type PerfilExpedienteFormValues = z.infer<typeof perfilExpedienteSchema>;

/** Alta de movimiento financiero (API `POST /api/v1/finanzas`). */
export const transaccionSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0' }),
  type: z.enum(['INGRESO', 'EGRESO']),
  concept: z
    .string()
    .trim()
    .min(1, { message: 'El concepto es obligatorio' })
    .max(500, { message: 'Máximo 500 caracteres' }),
});

export type TransaccionInput = z.infer<typeof transaccionSchema>;

/** Análisis normativo DOM — parámetros de predio (OGUC / LGUC). */
export const domAnalisisRequestSchema = z.object({
  superficieTerreno: z.coerce.number().positive(),
  coeficienteConstructibilidad: z.coerce.number().positive(),
  ocupacionSuelo: z.coerce.number().min(0).max(100),
  destino: z.string().trim().min(1).max(120),
});

export type DomAnalisisRequest = z.infer<typeof domAnalisisRequestSchema>;

/** Respuesta estructurada del motor de análisis normativo (IA + validación). */
export const domAnalisisResponseSchema = z.object({
  factible: z.boolean(),
  superficieMaximaEdificable: z.number(),
  observaciones: z.union([z.string(), z.array(z.string())]),
});

export type DomAnalisisResponse = z.infer<typeof domAnalisisResponseSchema>;

/** Generación de borrador expediente DOM — Form Generator (MINVU 2.1). */
export const domExpedienteGenerateRequestSchema = z.object({
  formType: z.literal('minvu-2.1-edificacion'),
  projectData: z
    .object({
      rolAvaluo: z.string().trim().max(120).optional().nullable(),
      nombrePropietario: z.string().trim().max(240).optional().nullable(),
      superficieTerreno: z.union([z.coerce.number().positive(), z.null()]).optional(),
      destinoPrincipal: z.string().trim().max(200).optional().nullable(),
      nombreArquitecto: z.string().trim().max(200).optional().nullable(),
      comuna: z.string().trim().max(120).optional().nullable(),
      region: z.string().trim().max(120).optional().nullable(),
      direccionObra: z.string().trim().max(300).optional().nullable(),
    })
    .default({}),
});

export type DomExpedienteGenerateRequest = z.infer<typeof domExpedienteGenerateRequestSchema>;

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
export const botEstadoSchema = z.enum(['activo', 'pausado', 'error']);

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
