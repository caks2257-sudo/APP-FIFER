import '@/engines/ai-orchestrator-engine';
import type { AiOrchestratorEngine } from '@/engines/ai-orchestrator-engine';
import { EngineRegistry } from '@/registry/engine-registry';
import { z } from 'zod';

const rearrangeLayoutIntentSchema = z.object({
  intent: z.literal('rearrange_dashboard_layout'),
  ownerId: z.string().min(1),
  prompt: z.string().min(1),
  revalidateTarget: z.string().min(1).optional(),
});

type LangGraphCallbackPayload = z.infer<typeof rearrangeLayoutIntentSchema> | Record<string, unknown>;

// 1. Acciones de Salida (FIFER -> LangGraph)
export const langgraph = {
  runAgent: async (input: string, ownerId: string) => {
    const orchestratorEngine = EngineRegistry.use<AiOrchestratorEngine>('ai-orchestrator-engine');
    return orchestratorEngine.rearrangeDashboardLayout(ownerId, input);
  },
};

// 2. Acciones de Entrada (Webhook -> FIFER)
export async function handleLanggraphCallback(
  eventId: string,
  payload: LangGraphCallbackPayload,
) {
  console.log(`[LangGraph] Procesando decisión del agente: ${eventId}`);

  const parsed = rearrangeLayoutIntentSchema.safeParse(payload);
  if (!parsed.success) {
    console.log('[LangGraph] Payload sin intent de layout reconocido.');
    return;
  }

  const orchestratorEngine = EngineRegistry.use<AiOrchestratorEngine>('ai-orchestrator-engine');
  await orchestratorEngine.rearrangeDashboardLayout(
    parsed.data.ownerId,
    parsed.data.prompt,
    parsed.data.revalidateTarget,
  );
}