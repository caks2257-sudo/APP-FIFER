import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';

import type { ExternalBridgeVault } from '@/types/external-bridge-vault';

// Aquí agregaremos más proveedores (Groq, Anthropic) en el futuro

export type TaskType = 'ROUTING' | 'BASIC_CHAT' | 'HEAVY_LIFTING';

/**
 * Inyecta en `process.env` las claves que el AI SDK lee para Google/OpenAI.
 * Debe llamarse antes de `generateText` / `generateObject` / `streamUI`.
 */
export function applyAiSdkEnvFromVault(vault: ExternalBridgeVault): void {
  const openaiKey = vault.OPENAI_API_KEY?.trim();
  if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;

  const googleKey =
    vault.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    vault.GEMINI_API_KEY?.trim();
  if (googleKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = googleKey;
}

/**
 * Perfil FinOps (§5): tareas baratas con Gemini Flash; carga pesada según rol/tier.
 * `userTier` alinea con `User.tier` en Prisma (`free` | `pro`).
 */
export function getOptimalModel(
  task: TaskType,
  userRole: string = 'user',
  userTier?: string,
) {
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (task === 'ROUTING' || task === 'BASIC_CHAT') {
    if (hasGoogle) return google('gemini-1.5-flash');
    return openai('gpt-4o-mini');
  }

  if (task === 'HEAVY_LIFTING') {
    const paid =
      userRole === 'admin' ||
      userRole === 'pro' ||
      userTier === 'pro';
    if (paid) {
      return openai('gpt-4o');
    }
    if (hasGoogle) return google('gemini-1.5-pro');
    return openai('gpt-4o-mini');
  }

  return hasGoogle ? google('gemini-1.5-flash') : openai('gpt-4o-mini');
}
