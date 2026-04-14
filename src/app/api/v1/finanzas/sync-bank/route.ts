import { NextResponse } from 'next/server';

import '@/engines/finance-engine';

import { loadDecryptedVault } from '@/lib/bridge-vault';
import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';
import type { ReconciliationSubEngineApi } from '@/engines/finance-engine/sub-engines/reconciliation';

export const dynamic = 'force-dynamic';

/**
 * GET: vista previa de movimientos bancarios aún no importados (sin persistir).
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(authUser);
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return NextResponse.json(
        { error: 'Identidad desalineada con Supabase Auth.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado tras sincronizar.' }, { status: 404 });
  }

  await prisma.financialAccount.upsert({
    where: { userId: dbUser.id },
    create: { userId: dbUser.id, balance: 0, currency: 'CLP' },
    update: {},
  });

  const account = await prisma.financialAccount.findUnique({
    where: { userId: dbUser.id },
  });
  if (!account) {
    return NextResponse.json({ error: 'Cuenta no disponible' }, { status: 500 });
  }

  try {
    const vault = await loadDecryptedVault();
    const sub = EngineRegistry.use<ReconciliationSubEngineApi>(
      'finance-engine:reconciliation',
    );
    const preview = await sub.previewBankReconciliation(
      prisma,
      account.id,
      vault,
    );

    return NextResponse.json({
      schemaVersion: '1.0-finanzas-sync-bank-preview',
      accountId: account.id,
      ...preview,
    });
  } catch (e) {
    console.error('[api/v1/finanzas/sync-bank] GET', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'reconciliation-error' },
      { status: 500 },
    );
  }
}

/**
 * POST: importa movimientos nuevos con estado COMPLETADO y actualiza saldo.
 */
export async function POST() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(authUser);
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return NextResponse.json(
        { error: 'Identidad desalineada con Supabase Auth.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado tras sincronizar.' }, { status: 404 });
  }

  await prisma.financialAccount.upsert({
    where: { userId: dbUser.id },
    create: { userId: dbUser.id, balance: 0, currency: 'CLP' },
    update: {},
  });

  const account = await prisma.financialAccount.findUnique({
    where: { userId: dbUser.id },
  });
  if (!account) {
    return NextResponse.json({ error: 'Cuenta no disponible' }, { status: 500 });
  }

  try {
    const vault = await loadDecryptedVault();
    const sub = EngineRegistry.use<ReconciliationSubEngineApi>(
      'finance-engine:reconciliation',
    );
    const applied = await sub.applyBankReconciliation(prisma, account.id, vault);

    return NextResponse.json({
      schemaVersion: '1.0-finanzas-sync-bank-apply',
      ...applied,
    });
  } catch (e) {
    console.error('[api/v1/finanzas/sync-bank] POST', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'reconciliation-error' },
      { status: 500 },
    );
  }
}
