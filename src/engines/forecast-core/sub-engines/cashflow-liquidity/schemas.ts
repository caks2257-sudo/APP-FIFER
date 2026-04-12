import { z } from 'zod';

/** Entrada al sub-motor (serializable desde Prisma / API). */
export const cashflowLiquidityInputSchema = z.object({
  account: z.object({
    balance: z.string().trim().min(1),
    currency: z.string().trim().min(1),
  }),
  transactions: z.array(
    z.object({
      amount: z.string().trim().min(1),
      type: z.enum(['INGRESO', 'EGRESO']),
      status: z.enum(['PENDIENTE', 'COMPLETADO', 'FALLIDO']),
      createdAt: z.union([z.date(), z.string().datetime({ offset: true })]),
    }),
  ),
});

export type CashflowLiquidityInput = z.infer<typeof cashflowLiquidityInputSchema>;

export const cashflowLiquidityInsufficientSchema = z.object({
  status: z.literal('insufficient_data'),
  reason: z.string(),
  rules: z.object({
    minTransactions: z.literal(3),
    minTemporalSpreadDays: z.literal(14),
  }),
  observed: z.object({
    transactionCount: z.number().int().nonnegative(),
    gapDaysFirstToLast: z.number().int().nonnegative(),
  }),
});

export const cashflowLiquidityReadySchema = z.object({
  status: z.literal('ready'),
  schemaVersion: z.literal('1.0-cashflow-liquidity'),
  horizonDays: z.literal(30),
  currency: z.string(),
  currentBalance: z.string(),
  totalSignedNetObserved: z.string(),
  observationWindowDays: z.number().int().positive(),
  meanDailyNet: z.string(),
  projectedNetCashflow30d: z.string(),
  projectedEndBalance: z.string(),
  negativeProjectedNetFlow: z.boolean(),
  projectedEndBalanceBelowZero: z.boolean(),
});

export const cashflowLiquidityOutputSchema = z.discriminatedUnion('status', [
  cashflowLiquidityInsufficientSchema,
  cashflowLiquidityReadySchema,
]);

export type CashflowLiquidityOutput = z.infer<typeof cashflowLiquidityOutputSchema>;
