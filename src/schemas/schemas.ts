import { z } from 'zod';

/** Estados operativos del contrato (BDUI Control de Contratos). */
export const contratoEstadoSchema = z.enum(['Vigente', 'Por Vencer', 'Alerta']);

export type ContratoEstado = z.infer<typeof contratoEstadoSchema>;

/**
 * Fila canónica ADN Central — App Control de Contratos (Chicureo).
 * `localNombre` identifica el local en corredor Chicureo.
 */
export const ContratosDataSchema = z.object({
  id: z.string().min(1),
  localNombre: z.string().min(1),
  arrendatario: z.string().min(1),
  montoUF: z.number().nonnegative(),
  /** Fecha ISO 8601 (date o datetime). */
  vencimiento: z
    .string()
    .min(10)
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'vencimiento debe ser fecha ISO válida' }),
  estado: contratoEstadoSchema,
});

export type ContratosDataRow = z.infer<typeof ContratosDataSchema>;

/** Payload lista BDUI + metadatos opcionales. */
export const contratosListPayloadSchema = z.object({
  schemaVersion: z.string().optional(),
  contratos: z.array(ContratosDataSchema).default([]),
  degraded: z.boolean().optional(),
  errorMessage: z.string().optional(),
  /** Código bridge §0.25 (p.ej. HTTP_ERROR, ZOD_MISMATCH). */
  errorCode: z.string().optional(),
});

export type ContratosListPayload = z.infer<typeof contratosListPayloadSchema>;
