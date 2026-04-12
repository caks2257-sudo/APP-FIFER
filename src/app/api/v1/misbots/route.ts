import { NextResponse } from 'next/server';

import '@/engines/bot-engine';
import type { BotEngine } from '@/engines/bot-engine';
import { mapBotStatusToEstado } from '@/engines/bot-engine';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';
import type { BotDataPayload, BotRow } from '@/types/schemas';

function toBotRow(b: {
  id: string;
  name: string;
  status: string;
  modelId: string;
  avatarUrl: string | null;
}): BotRow {
  return {
    id: b.id,
    nombre: b.name,
    estado: mapBotStatusToEstado(b.status),
    modeloAsignado: b.modelId,
    costoPromedioUF: 0,
    avatarUrl: b.avatarUrl ?? undefined,
  };
}

/**
 * Lista de bots del usuario autenticado (Prisma vía `bot-engine`).
 * Sin sesión: lista vacía (compatible con bridge / health).
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const body: BotDataPayload = {
      schemaVersion: '1.0-misbots',
      bots: [],
      degraded: false,
    };
    return NextResponse.json(body, { status: 200 });
  }

  try {
    const engine = EngineRegistry.use<BotEngine>('bot-engine');
    const rows = await engine.getUserBots(user.id);
    const body: BotDataPayload = {
      schemaVersion: '1.0-misbots',
      bots: rows.map(toBotRow),
      degraded: false,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al listar bots';
    const body: BotDataPayload = {
      schemaVersion: '1.0-misbots',
      bots: [],
      degraded: true,
      errorMessage: message,
      errorCode: 'BOT_ENGINE',
    };
    return NextResponse.json(body, { status: 200 });
  }
}
