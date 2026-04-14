import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePrismaUser } from '@/app/api/v1/ai-orchestrator/_auth';
import { deleteSubApp } from '@/engines/master-app-factory/factory-engine';

const bodySchema = z.object({
  appId: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'appId requerido', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  const result = await deleteSubApp(parsed.data.appId, auth.dbUser.id);
  return NextResponse.json(result, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId')?.trim();
  if (!appId) {
    return NextResponse.json({ error: 'Query appId requerido' }, { status: 422 });
  }

  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  const result = await deleteSubApp(appId, auth.dbUser.id);
  return NextResponse.json(result, { status: 200 });
}
