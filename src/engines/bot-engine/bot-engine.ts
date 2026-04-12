import type { Bot } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export const BOT_ENGINE_ID = 'bot-engine' as const;

export type BotEngineHealth = {
  ok: boolean;
  engineId: typeof BOT_ENGINE_ID;
};

/** Normaliza `Bot.status` (Prisma) al enum de UI / BDUI. */
export function mapBotStatusToEstado(status: string): 'activo' | 'pausado' | 'error' {
  const s = status.trim().toLowerCase();
  if (s === 'error' || s === 'fallido' || s === 'failed') return 'error';
  if (s === 'pausado' || s === 'paused' || s === 'inactive' || s === 'stopped') return 'pausado';
  return 'activo';
}

export class BotEngine {
  readonly id = BOT_ENGINE_ID;

  getHealthStatus(): BotEngineHealth {
    return { ok: true, engineId: BOT_ENGINE_ID };
  }

  async getUserBots(userId: string): Promise<Bot[]> {
    return prisma.bot.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getBotDetails(botId: string, userId: string): Promise<Bot | null> {
    return prisma.bot.findFirst({
      where: { id: botId, ownerId: userId },
    });
  }

  async updateBotStatus(
    botId: string,
    userId: string,
    status: string,
  ): Promise<{ ok: true; bot: Bot } | { ok: false; code: string; message: string }> {
    const existing = await prisma.bot.findFirst({
      where: { id: botId, ownerId: userId },
    });
    if (!existing) {
      return { ok: false, code: 'NOT_FOUND', message: 'Bot no encontrado o sin permiso.' };
    }
    const bot = await prisma.bot.update({
      where: { id: botId },
      data: { status },
    });
    return { ok: true, bot };
  }
}
