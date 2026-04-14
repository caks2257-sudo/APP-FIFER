import { z } from 'zod';

const VaultSchema = z.record(z.string(), z.string().min(1)).optional();

const BridgeModeSchema = z.enum(['MOCK', 'PROD']);

export const CreatePaymentCheckoutInputSchema = z
  .object({
    prisma: z.unknown(),
    accountId: z.string().trim().min(1),
    amountClp: z.number().positive(),
    description: z.string().trim().min(1).max(500),
    publicOrigin: z.string().trim().url(),
    vault: VaultSchema,
  })
  .strict();

export const CreatePaymentCheckoutOutputSchema = z
  .object({
    mode: BridgeModeSchema,
    url: z.string().trim().url(),
    checkoutId: z.string().trim().min(1),
    transactionId: z.string().trim().min(1),
  })
  .strict();

export const EmitInvoiceOptionsSchema = z
  .object({
    onlyPaymentCheckout: z.boolean().optional(),
    publicOrigin: z.string().trim().url().optional(),
  })
  .strict();

export const EmitInvoiceInputSchema = z
  .object({
    prisma: z.unknown(),
    transactionId: z.string().trim().min(1),
    vault: VaultSchema,
    options: EmitInvoiceOptionsSchema.optional(),
  })
  .strict();

export const EmitInvoiceOutputSchema = z
  .object({
    ok: z.boolean(),
    skipped: z.boolean().optional(),
    reason: z.string().optional(),
    folio: z.string().nullable().optional(),
  })
  .strict();

export const TriggerAutoInvoiceInputSchema = z
  .object({
    transactionId: z.string().trim().min(1),
    publicOrigin: z.string().trim().url(),
  })
  .strict();

export const ReconciliationMovementSchema = z
  .object({
    externalId: z.string().trim().min(1),
    postedAt: z.string().trim().min(1),
    amountClp: z.number(),
    type: z.enum(['INGRESO', 'EGRESO']),
    concept: z.string(),
  })
  .strict();

export const ReconciliationPreviewInputSchema = z
  .object({
    prisma: z.unknown(),
    accountId: z.string().trim().min(1),
    vault: VaultSchema,
  })
  .strict();

export const ReconciliationPreviewOutputSchema = z
  .object({
    bridgeMode: BridgeModeSchema,
    pendingCount: z.number().int().nonnegative(),
    newMovements: z.array(ReconciliationMovementSchema),
  })
  .strict();

export const ReconciliationApplyInputSchema = z
  .object({
    prisma: z.unknown(),
    accountId: z.string().trim().min(1),
    vault: VaultSchema,
  })
  .strict();

export const ReconciliationApplyOutputSchema = z
  .object({
    bridgeMode: BridgeModeSchema,
    savedCount: z.number().int().nonnegative(),
    savedIds: z.array(z.string()),
    balance: z.string(),
    currency: z.string(),
  })
  .strict();

export type CreatePaymentCheckoutInput = z.infer<
  typeof CreatePaymentCheckoutInputSchema
>;
export type CreatePaymentCheckoutOutput = z.infer<
  typeof CreatePaymentCheckoutOutputSchema
>;
export type EmitInvoiceInput = z.infer<typeof EmitInvoiceInputSchema>;
export type EmitInvoiceOutput = z.infer<typeof EmitInvoiceOutputSchema>;
export type TriggerAutoInvoiceInput = z.infer<typeof TriggerAutoInvoiceInputSchema>;
export type ReconciliationPreviewInput = z.infer<
  typeof ReconciliationPreviewInputSchema
>;
export type ReconciliationPreviewOutput = z.infer<
  typeof ReconciliationPreviewOutputSchema
>;
export type ReconciliationApplyInput = z.infer<
  typeof ReconciliationApplyInputSchema
>;
export type ReconciliationApplyOutput = z.infer<
  typeof ReconciliationApplyOutputSchema
>;

// Alias para los esquemas requeridos por el motor de finanzas
export const ConciliacionSchema = ReconciliationPreviewInputSchema;
export type ConciliacionInput = z.infer<typeof ConciliacionSchema>;

export const PagoSchema = CreatePaymentCheckoutInputSchema;
export type PagoInput = z.infer<typeof PagoSchema>;
