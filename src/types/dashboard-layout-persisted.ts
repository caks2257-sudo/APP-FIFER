import { z } from 'zod';

const layoutCellSchema = z.object({
  x: z.number().int().min(0).max(100_000),
  y: z.number().int().min(0).max(100_000),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(24),
});

/** Widget mínimo para líquidos persistidos (alineado a `DashboardWidget`). */
export const persistedLiquidWidgetSchema = z.object({
  id: z.string().min(1),
  boxId: z.string().min(1),
  module: z.enum(['finance', 'content', 'contracts', 'system', 'inmobiliario', 'bots']),
  colSpan: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]),
  data: z.record(z.string(), z.unknown()),
  config: z.record(z.string(), z.unknown()).optional(),
  state: z
    .object({
      isLoading: z.boolean().optional(),
      hasError: z.boolean().optional(),
      isLocked: z.boolean().optional(),
    })
    .optional(),
});

export const dashboardLayoutPersistedSchema = z.object({
  cells: z.record(z.string(), layoutCellSchema),
  slotOrder: z.array(z.string()).optional(),
  liquidAddonWidgets: z.array(persistedLiquidWidgetSchema).optional(),
});

export type DashboardLayoutPersisted = z.infer<typeof dashboardLayoutPersistedSchema>;
export type LayoutCell = z.infer<typeof layoutCellSchema>;
