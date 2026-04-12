/**
 * Semilla temporal: transacciones de prueba para superar el cold start del motor
 * `forecast-core:cashflow-liquidity` (≥3 COMPLETADO o ≥14 días de dispersión).
 *
 * Uso: npm run db:seed-finanzas
 * Requiere: `DATABASE_URL`, usuario Prisma con email `caks2257@gmail.com`.
 */
import 'dotenv/config';

import { Decimal } from '@prisma/client/runtime/library';

import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = 'caks2257@gmail.com';

function utcNoonDaysAgo(daysAgo: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

/** 18 movimientos en ~45 días: ingresos fuertes + egresos chicos; mezcla de tendencias para UI. */
const SEED_ROWS: Array<{
  daysAgo: number;
  type: 'INGRESO' | 'EGRESO';
  amount: number;
  concept: string;
}> = [
  { daysAgo: 44, type: 'INGRESO', amount: 1_450_000, concept: 'Facturación — proyecto Alpha' },
  { daysAgo: 43, type: 'EGRESO', amount: 42_000, concept: 'Servicios básicos' },
  { daysAgo: 41, type: 'EGRESO', amount: 18_500, concept: 'Supermercado' },
  { daysAgo: 38, type: 'INGRESO', amount: 920_000, concept: 'Pago contrato B' },
  { daysAgo: 36, type: 'EGRESO', amount: 65_000, concept: 'Proveedor materiales' },
  { daysAgo: 33, type: 'EGRESO', amount: 12_000, concept: 'Transporte' },
  { daysAgo: 30, type: 'INGRESO', amount: 1_100_000, concept: 'Transferencia cliente C' },
  { daysAgo: 28, type: 'EGRESO', amount: 95_000, concept: 'Software / SaaS' },
  { daysAgo: 25, type: 'EGRESO', amount: 22_000, concept: 'Combustible' },
  { daysAgo: 22, type: 'INGRESO', amount: 380_000, concept: 'Honorarios parciales' },
  { daysAgo: 19, type: 'EGRESO', amount: 150_000, concept: 'Equipo oficina' },
  { daysAgo: 16, type: 'EGRESO', amount: 31_000, concept: 'Marketing digital' },
  { daysAgo: 13, type: 'INGRESO', amount: 750_000, concept: 'Cobranza pendiente' },
  { daysAgo: 11, type: 'EGRESO', amount: 48_000, concept: 'Asesoría externa' },
  { daysAgo: 8, type: 'EGRESO', amount: 27_000, concept: 'Logística' },
  { daysAgo: 5, type: 'EGRESO', amount: 210_000, concept: 'Impuesto provisional' },
  { daysAgo: 3, type: 'INGRESO', amount: 200_000, concept: 'Ajuste ingreso menor' },
  { daysAgo: 1, type: 'EGRESO', amount: 88_000, concept: 'Mantenimiento' },
];

async function main(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (!user) {
    console.error(
      `[seed-finanzas-test] No existe User con email ${ADMIN_EMAIL}. Ejecute primero npm run fifer:admin-setup o cree el usuario en Prisma.`,
    );
    process.exit(1);
  }

  const account = await prisma.financialAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      balance: new Decimal(0),
      currency: 'CLP',
    },
    update: {},
  });

  const removed = await prisma.transaction.deleteMany({
    where: {
      accountId: account.id,
      concept: { startsWith: '[seed-test]' },
    },
  });
  if (removed.count > 0) {
    console.log(`[seed-finanzas-test] Eliminadas ${removed.count} transacciones [seed-test] previas.`);
  }

  const created = await prisma.transaction.createMany({
    data: SEED_ROWS.map((r) => ({
      accountId: account.id,
      amount: new Decimal(r.amount),
      currency: 'CLP',
      type: r.type,
      concept: `[seed-test] ${r.concept}`,
      status: 'COMPLETADO' as const,
      createdAt: utcNoonDaysAgo(r.daysAgo),
    })),
  });

  const allTx = await prisma.transaction.findMany({
    where: { accountId: account.id, status: 'COMPLETADO' },
  });

  let balance = new Decimal(0);
  for (const t of allTx) {
    if (t.type === 'INGRESO') {
      balance = balance.plus(t.amount);
    } else {
      balance = balance.minus(t.amount);
    }
  }

  await prisma.financialAccount.update({
    where: { id: account.id },
    data: { balance },
  });

  let gapDays = 0;
  if (allTx.length > 0) {
    const first = allTx.reduce(
      (min, t) => (t.createdAt < min ? t.createdAt : min),
      allTx[0]!.createdAt,
    );
    const last = allTx.reduce(
      (max, t) => (t.createdAt > max ? t.createdAt : max),
      allTx[0]!.createdAt,
    );
    gapDays = Math.floor((last.getTime() - first.getTime()) / 86_400_000);
  }

  console.log('[seed-finanzas-test] OK');
  console.log(`  User: ${user.email} (${user.id})`);
  console.log(`  FinancialAccount: ${account.id}`);
  console.log(`  Transacciones insertadas en este lote: ${created.count}`);
  console.log(`  Total COMPLETADO en cuenta: ${allTx.length}`);
  console.log(`  Saldo recalculado: ${balance.toFixed(2)} CLP`);
  console.log(`  Dispersión aprox. primera→última: ${gapDays} días`);
}

main()
  .catch((e) => {
    console.error('[seed-finanzas-test]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
