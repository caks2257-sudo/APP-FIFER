import { z } from 'zod';

export const layoutCommandSchema = z.object({
  action: z.enum(['add', 'remove', 'resize']),
  boxId: z.string().min(1).optional(),
  widgetId: z.string().min(1).optional(),
  colSpan: z.number().int().min(1).max(12).optional(),
  rowSpan: z.number().int().min(1).max(24).optional(),
});

export type LayoutCommand = z.infer<typeof layoutCommandSchema>;

export const sharedChatEnvelopeSchema = z.object({
  reply: z.string(),
  layoutCommand: layoutCommandSchema.nullable().optional(),
});

export type SharedChatEnvelope = z.infer<typeof sharedChatEnvelopeSchema>;
