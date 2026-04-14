import { NextRequest, NextResponse } from 'next/server';

import {
  PrismaAuthLegacyEmailConflictError,
  upsertPrismaUserFromSupabaseAuth,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { perfilExpedienteSchema } from '@/types/schemas';

export const dynamic = 'force-dynamic';

function expedienteJson(e: {
  rut: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nacionalidad: string;
  fechaNacimiento: Date;
}) {
  return {
    rut: e.rut,
    nombres: e.nombres,
    apellidoPaterno: e.apellidoPaterno,
    apellidoMaterno: e.apellidoMaterno,
    nacionalidad: e.nacionalidad,
    fechaNacimiento: e.fechaNacimiento.toISOString().slice(0, 10),
  };
}

/**
 * GET: expediente + tier/role del `User` Prisma vinculado al email de sesión Supabase.
 * POST: valida `perfilExpedienteSchema` y hace upsert en `Expediente` + actualiza `User.name` compuesto.
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
    await upsertPrismaUserFromSupabaseAuth(authUser);
    dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { expediente: true },
    });
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return NextResponse.json(
        { error: 'Identidad desalineada con Supabase Auth; ejecute migración de UUID.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado tras sincronizar.' }, { status: 404 });
  }

  return NextResponse.json({
    expediente: dbUser.expediente ? expedienteJson(dbUser.expediente) : null,
    user: {
      email: dbUser.email,
      tier: dbUser.tier,
      role: dbUser.role,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = perfilExpedienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const fecha = new Date(`${data.fechaNacimiento}T12:00:00.000Z`);
  const displayName =
    `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`.trim();

  let dbUser;
  try {
    await upsertPrismaUserFromSupabaseAuth(authUser);
    dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
    });
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return NextResponse.json(
        { error: 'Identidad desalineada con Supabase Auth; ejecute migración de UUID.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado tras sincronizar.' }, { status: 404 });
  }

  try {
    const expediente = await prisma.expediente.upsert({
      where: { userId: dbUser.id },
      create: {
        userId: dbUser.id,
        rut: data.rut.trim(),
        nombres: data.nombres,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        nacionalidad: data.nacionalidad,
        fechaNacimiento: fecha,
      },
      update: {
        rut: data.rut.trim(),
        nombres: data.nombres,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        nacionalidad: data.nacionalidad,
        fechaNacimiento: fecha,
      },
    });

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { name: displayName },
    });

    return NextResponse.json({
      ok: true,
      expediente: expedienteJson(expediente),
    });
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'RUT ya registrado para otro usuario' },
        { status: 409 },
      );
    }
    console.error('[api/v1/perfil] POST', e);
    return NextResponse.json({ error: 'Error al guardar expediente' }, { status: 500 });
  }
}
