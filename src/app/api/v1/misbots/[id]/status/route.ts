import { NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/bot-engine';
import type { BotEngine } from '@/engines/bot-engine';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';

const bodySchema = z.object({
  status: z.enum(['activo', 'pausado', 'error']),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await Promise.resolve(params);
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const engine = EngineRegistry.use<BotEngine>('bot-engine');
  const result = await engine.updateBotStatus(id, user.id, parsed.data.status);
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 404 });
  }
  return NextResponse.json({ ok: true, bot: result.bot }, { status: 200 });
}
