import { generateObject } from 'ai';
import type { ModelMessage } from 'ai';

import { loadDecryptedVault } from '@/lib/bridge-vault';
import { getAvailableModulesContext } from '@/registry/discovery-registry';
import {
  applyAiSdkEnvFromVault,
  getOptimalModel,
} from '../../model-selector';

import {
  OrchestratorDecisionSchema,
  type OrchestratorDecision,
} from '../schema';

const CLASSIFIER_SYSTEM = `Eres el Router de Tráfico de FIFER. Analiza el historial completo de la conversación frente a los módulos disponibles.

Reglas:
- Si la intención es de lectura rápida o ver datos en widgets (saldo, flujo, banco), elige intent STREAM_UI y, si aplica, visualWidgets acorde (p. ej. BankConnectionWidget, CashFlowWidget).
- Si es un flujo complejo o asistido paso a paso, elige GUIDED_OVERLAY y targetModuleId del módulo apropiado.
- Si el usuario pide monitoreo del sistema, latencia, logs, APIs, telemetría o estado global de FIFER, y el módulo system-telemetry-war-room está listado, usa SYSTEM_WAR_ROOM (solo si su accessLevel es coherente con el rol).
- Si el prompt coincide fuertemente con más de un módulo (mismas keywords ambiguas), DEBES elegir el intent DISAMBIGUATE. No adivines: elige DISAMBIGUATE.
- NAVIGATE cuando el usuario quiera ir a una app o sección concreta sin UI generativa.
- Si el usuario proporciona una URL (o dominio) y pide explícitamente crear una nueva aplicación, workspace o sub-app basada en esa URL, DEBES elegir el intent CREATE_APP_FROM_URL. Rellena sourceUrl, scaffoldBusinessName y scaffoldProposedModules solo con módulos que existan en la lista de manifiestos del contexto; no inventes integraciones externas. No enrutes aún a módulos individuales con NAVIGATE/GUIDED_OVERLAY para este caso.
- REGLA DE NEGOCIO ESTRICTA PARA scaffoldProposedModules: NUNCA sugieras un módulo si no tiene una relación semántica lógica y directa con el rubro del negocio inferido. Por ejemplo, ES ILEGAL sugerir un módulo de 'Afiliados Belleza' para una empresa de construcción, ferretería o pisos de madera. Si el negocio es de pisos, solo propone Finanzas y Redes Sociales. Si no encaja perfectamente, NO lo incluyas en el array.
- FORMATO OBLIGATORIO de scaffoldProposedModules: debe ser un **array JSON** con **un objeto por cada módulo recomendado** (campos moduleId, moduleName, justification). Si recomiendas dos capacidades (p. ej. finance-core y social-media-core), el array **debe incluir dos entradas distintas**; nunca sustituyas varios módulos por uno solo ni devuelvas un único objeto en lugar del arreglo.
- TEXT_ONLY para conversación general sin enrutamiento especial.

Responde únicamente con el objeto estructurado válido según el esquema.`;

const DIRECTIVA_MEMORIA = `
DIRECTIVA DE MEMORIA Y RESOLUCIÓN:
Analiza el HISTORIAL completo de mensajes. Si en el penúltimo mensaje tú (el asistente) hiciste una pregunta de desambiguación (DISAMBIGUATE) y el usuario acaba de responderla en su último mensaje, DEBES resolver el conflicto INMEDIATAMENTE.
NO vuelvas a elegir DISAMBIGUATE. Elige 'GUIDED_OVERLAY' o 'NAVIGATE' según la respuesta del usuario y asigna el 'targetModuleId' correcto.
Excepción: si el último mensaje del usuario es claramente un pedido de scaffolding desde URL (crear app/workspace desde un dominio), usa CREATE_APP_FROM_URL en lugar de volver a desambiguar hacia módulos sueltos.`;

function normalizeClassifierMessages(input: readonly ModelMessage[]): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const m of input) {
    if (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') continue;
    const c = typeof m.content === 'string' ? m.content : '';
    const trimmed = c.trim();
    if (!trimmed) continue;
    out.push({ role: m.role, content: trimmed });
  }
  return out;
}

export async function runClassifierNode(
  messages: ModelMessage[],
  userRole: string,
): Promise<OrchestratorDecision> {
  const normalized = normalizeClassifierMessages(messages);
  if (normalized.length === 0) {
    return {
      intent: 'TEXT_ONLY',
      targetModuleId: null,
      sourceUrl: null,
      scaffoldBusinessName: null,
      scaffoldProposedModules: null,
      visualWidgets: null,
      reasoning: 'No recibí mensajes válidos para clasificar.',
    };
  }

  const modulesContext = getAvailableModulesContext(userRole);
  const system = `${CLASSIFIER_SYSTEM}

## Módulos disponibles (filtrados por rol del usuario)
${modulesContext}
${DIRECTIVA_MEMORIA}`;

  const vault = await loadDecryptedVault();
  applyAiSdkEnvFromVault(vault);

  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!hasGoogle && !hasOpenAI) {
    return {
      intent: 'TEXT_ONLY',
      targetModuleId: null,
      sourceUrl: null,
      scaffoldBusinessName: null,
      scaffoldProposedModules: null,
      visualWidgets: null,
      reasoning:
        'Sin credenciales LLM (GOOGLE_GENERATIVE_AI_API_KEY o OPENAI_API_KEY): clasificador no disponible.',
    };
  }

  const routingModel = getOptimalModel('ROUTING', userRole);

  try {
    const { object: decision } = await generateObject({
      model: routingModel,
      schema: OrchestratorDecisionSchema,
      system,
      messages: normalized,
      temperature: 0,
    });
    return decision;
  } catch (error) {
    return {
      intent: 'ERROR',
      targetModuleId: null,
      sourceUrl: null,
      scaffoldBusinessName: null,
      scaffoldProposedModules: null,
      visualWidgets: null,
      reasoning: `Fallo en clasificador: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
