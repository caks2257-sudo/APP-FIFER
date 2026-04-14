import { NextResponse } from 'next/server';

import { requirePrismaUser } from '@/app/api/v1/ai-orchestrator/_auth';
import {
  AppProvisioningPayloadSchema,
  dispatchAppProvisioningJob,
  type AppProvisioningPayload,
} from '@/engines/master-app-factory';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = AppProvisioningPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  const payload: AppProvisioningPayload = parsed.data;
  const result = await dispatchAppProvisioningJob(payload, auth.dbUser.id);

  return NextResponse.json(result, { status: 200 });
}
