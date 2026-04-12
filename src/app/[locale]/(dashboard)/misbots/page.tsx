import type { Bot } from '@prisma/client';

import '@/engines/bot-engine';
import type { BotEngine } from '@/engines/bot-engine';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';

import { MisbotsHubView } from './MisbotsHubView';

export default async function MisbotsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialBots: Bot[] = [];
  if (user) {
    const engine = EngineRegistry.use<BotEngine>('bot-engine');
    initialBots = await engine.getUserBots(user.id);
  }

  const serialized = JSON.parse(JSON.stringify(initialBots)) as Bot[];

  return <MisbotsHubView initialBots={serialized} hasSession={Boolean(user)} />;
}
