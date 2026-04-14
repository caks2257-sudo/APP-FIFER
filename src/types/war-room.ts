import { z } from 'zod';

/** Configuración estructurada del Smart War Room (Meta-OS / Hub-and-Spoke). */
export const warRoomFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'url', 'select', 'checkbox']),
  label: z.string(),
  options: z.array(z.string()).optional(),
  /** Valor inicial opcional (p. ej. URL detectada). */
  defaultValue: z.string().optional(),
});

export const warRoomSectionSchema = z.object({
  title: z.string(),
  fields: z.array(warRoomFieldSchema),
});

export const warRoomConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  targetAction: z.enum(['CREATE_MASTER_APP', 'ADD_SUB_APP', 'LAUNCH_BOT']),
  sections: z.array(warRoomSectionSchema),
  actionButtonText: z.string(),
});

export type WarRoomConfig = z.infer<typeof warRoomConfigSchema>;
