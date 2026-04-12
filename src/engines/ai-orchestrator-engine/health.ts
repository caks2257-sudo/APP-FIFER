import {
  AODS_INFRA_DECLARED_ENV_KEYS,
  isPlaceholderSecret,
} from '@fifer/external-bridge-engine';

import {
  AI_ORCHESTRATOR_ENGINE_ID,
  type AiOrchestratorHealth,
} from './types';

function missingAodsInfraKeys(): string[] {
  const out: string[] = [];
  for (const k of AODS_INFRA_DECLARED_ENV_KEYS) {
    const v = process.env[k]?.trim();
    if (v == null || isPlaceholderSecret(v)) out.push(k);
  }
  return out;
}

/**
 * Pulso del motor AODS — usado por `AiOrchestratorEngine.getHealthStatus()`.
 * (El snapshot de War Room por motor viene de `system-health` + `EngineRegistry`, no de este tipo.)
 */
export function getAiOrchestratorHealth(): AiOrchestratorHealth {
  try {
    const missingInfraKeys = missingAodsInfraKeys();
    const base =
      'AODS listo: fases 0–7, 9 (deploy Vercel vía hook/bridge) operativas con Prisma.';
    return {
      ok: true,
      engineId: AI_ORCHESTRATOR_ENGINE_ID,
      missingInfraKeys:
        missingInfraKeys.length > 0 ? missingInfraKeys : undefined,
      detail:
        missingInfraKeys.length > 0
          ? `${base} Pendiente declarar/guardar: ${missingInfraKeys.join(', ')} (§25.2.2; ver system-health external + Sala de Guerra).`
          : base,
    };
  } catch (error) {
    return {
      ok: false,
      engineId: AI_ORCHESTRATOR_ENGINE_ID,
      detail: error instanceof Error ? error.message : 'Unknown AODS health error',
    };
  }
}
