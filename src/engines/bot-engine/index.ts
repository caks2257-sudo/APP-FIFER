import { EngineRegistry } from '@/registry/engine-registry';

import { BOT_ENGINE_ID, BotEngine } from './bot-engine';

const LOG_PREFIX = `[FIFER Engine ${BOT_ENGINE_ID}]`;

try {
  EngineRegistry.register(BOT_ENGINE_ID, new BotEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

export { BOT_ENGINE_ID, BotEngine, mapBotStatusToEstado } from './bot-engine';
export type { BotEngineHealth } from './bot-engine';

try {
  void BOT_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
