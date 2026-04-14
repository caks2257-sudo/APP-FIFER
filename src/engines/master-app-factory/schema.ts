import { z } from 'zod';

export const AppProvisioningPayloadSchema = z.object({
  businessName: z.string().min(1),
  primaryUrl: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().optional(),
  ),
  requestedModules: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "List of module IDs (e.g., 'finance-core', 'social-media-core') to provision for this sub-app.",
    ),
  sourcePlatform: z
    .string()
    .optional()
    .describe("e.g., 'Shopify', 'MercadoLibre' if inferred or selected."),
  /** Acción declarada por el War Room (auditoría / routing interno). */
  targetAction: z.enum(['CREATE_MASTER_APP', 'ADD_SUB_APP', 'LAUNCH_BOT']).optional(),
});

export type AppProvisioningPayload = z.infer<typeof AppProvisioningPayloadSchema>;
