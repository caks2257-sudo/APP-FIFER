import { z } from 'zod';

const hex6 = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validación Zod para entradas del genoma de boxes (FIFER_BOX_CATALOG).
 */
export const BoxManifestSchema = z.object({
  boxId: z.string().min(1),
  module: z.enum([
    'finance',
    'content',
    'affiliates',
    'contracts',
    'system',
    'inmobiliario',
    'bots',
  ]),
  minWidth: z.number().int().min(1).max(12),
  minHeight: z.number().int().min(1),
  biome: z.object({
    primary: z.string().regex(hex6),
    accent: z.string().regex(hex6),
  }),
  permissions: z.array(z.string().min(1)),
  component: z.enum([
    'chart-box',
    'activity-box',
    'stat-card',
    'system-monitor',
    'contratos-main',
    'inmobiliario-main',
    'misbots-main',
  ]),
  isResizable: z.boolean().optional().default(true),
});

export type BoxManifest = z.infer<typeof BoxManifestSchema>;
