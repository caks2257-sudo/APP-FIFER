import {
  AodsDocType,
  AodsMessageRole,
  AodsSessionStatus,
  Prisma,
} from '@prisma/client';

import { loadDecryptedVault } from '@/lib/bridge-vault';
import { prisma } from '@/lib/prisma';

import { getAiOrchestratorHealth } from './health';
import { completeLlmWithFallback } from './llm/gateway';
import { loadMasterProtocolText } from './master-protocol';
import {
  AI_ORCHESTRATOR_ENGINE_ID,
  type AiOrchestratorHealth,
  type AodsIdeationMessage,
  type AnalyzeNotebookResult,
  type GenerateGeminiActivatorResult,
  type IdeateResult,
  type InitSessionResult,
  type OrchestratorConfig,
  type SessionStartParams,
  type TriggerDeploymentResult,
  type UpdateGeminiDocResult,
} from './types';

/** §25.2.1 — advertencia obligatoria en MOCK (fase NotebookLM prompt). */
const MOCK_NOTEBOOK_PROMPT_NOTICE =
  '⚠️ [MODO SIMULADO]: ningún proveedor LLM disponible (Vertex / OpenAI / Anthropic). Prompt generado mediante heurística local.';

/** §25.2.1 — advertencia visible cuando GEMINI_DOC no usa API en vivo. */
const MOCK_GEMINI_DOC_NOTICE =
  '⚠️ [MODO SIMULADO]: API de IA no conectada. GEMINI_DOC generado mediante heurística local sin datos de modelo en vivo.';

const IDEATION_SYSTEM_PROMPT =
  'Eres un arquitecto de software senior ayudando a un desarrollador a definir un módulo para FIFER. Haz preguntas breves y concisas para refinar la idea hasta tener un \'Plan Maestro\' claro. No escribas código, solo define la arquitectura, requerimientos y motores involucrados.';

const NOTEBOOK_PHASE_1_SYSTEM_LIVE = `Eres el Arquitecto de FIFER. Extrae del Plan Maestro las entidades técnicas (motores, bases de datos) y genera un prompt estricto para que NotebookLM busque el contexto en el código fuente`;

const PHASE_3_GEMINI_DOC_SYSTEM = `Eres el Arquitecto Jefe de FIFER. Recibes el volcado de texto procedente de NotebookLM (u otra fuente equivalente).
Conviértelo en un documento técnico estructurado: responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto antes ni después), que represente el GEMINI_DOC del pipeline AODS.
Debes identificar: dependencias de motores (engines), esquemas de BD afectados (Prisma/PostgreSQL), y orden lógico de ejecución.
Claves obligatorias: blueprint_version (string), summary (string), execution_steps (array de strings), engine_dependencies (array de strings), schema_touchpoints (array de strings).`;

const PHASE_7_UPDATE_BLUEPRINT_SYSTEM = `Eres el Arquitecto Jefe de FIFER. Recibes el JSON actual del blueprint (GEMINI_DOC) y un informe de progreso del desarrollador (salida de Cursor u otro IDE).
Fusiona el blueprint con el progreso: marca o reordena execution_steps si el informe indica trabajo completado; añade rutas de archivos creados o modificados en la clave "files_touched" (array de strings) cuando el informe las mencione; actualiza summary de forma breve si cambió el alcance.
Responde ÚNICAMENTE con un objeto JSON válido (sin markdown). Incluye siempre la clave opcional "aods_update_summary" (string breve, una frase) describiendo el cambio para el usuario.
Preserva el resto de claves útiles del blueprint anterior y añade "source_phase": "phase_7_update".`;

function buildNotebookInstructionsDraft(planMaestro: string): string {
  return `Analiza este Plan Maestro para FIFER y genera un resumen técnico estructurado para NotebookLM, enfocándote en dependencias de motores y esquema de base de datos:\n\n${planMaestro}`;
}

async function buildPhase1SystemPrompt(): Promise<string> {
  const master = (await loadMasterProtocolText()).trim();
  if (!master) return NOTEBOOK_PHASE_1_SYSTEM_LIVE;
  return `${master}\n\n---\n\n${NOTEBOOK_PHASE_1_SYSTEM_LIVE}`;
}

function formatIdeationBlockFromJson(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  const lines: string[] = [];
  for (const item of raw) {
    if (
      item != null &&
      typeof item === 'object' &&
      'role' in item &&
      'content' in item &&
      typeof (item as { content: unknown }).content === 'string'
    ) {
      const role = String((item as { role: unknown }).role);
      const content = String((item as { content: string }).content);
      lines.push(`[${role}]: ${content}`);
    }
  }
  return lines.join('\n\n');
}

function buildPhase1UserContent(planMaestro: string, ideationBlock: string): string {
  const draft = buildNotebookInstructionsDraft(planMaestro);
  const trimmed = ideationBlock.trim();
  if (!trimmed) return draft;
  return `## Historial de ideación (Fase -1)\n\n${trimmed}\n\n---\n\n${draft}`;
}

function normalizeIdeationForOpenAi(
  history: AodsIdeationMessage[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of history) {
    const r = m.role.toLowerCase();
    if (r === 'assistant') out.push({ role: 'assistant', content: m.content });
    else if (r === 'user' || r === 'system')
      out.push({ role: 'user', content: m.content });
  }
  if (out.length === 0) return [{ role: 'user', content: '…' }];
  if (out[0].role === 'assistant') {
    out.unshift({ role: 'user', content: '[Inicio de conversación]' });
  }
  return out;
}

/**
 * Parseo seguro de JSON desde salida de modelo (código, fences ```json, subcadena entre { }).
 */
function parseJsonObjectFromAiText(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  const tryParseObject = (raw: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* siguiente intento */
    }
    return null;
  };

  const direct = tryParseObject(trimmed);
  if (direct) return direct;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const fenced = tryParseObject(fence[1].trim());
    if (fenced) return fenced;
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const sliced = tryParseObject(trimmed.slice(start, end + 1));
    if (sliced) return sliced;
  }

  return {
    blueprint_version: '1.0-fallback',
    summary:
      'No se pudo parsear JSON del modelo; volcado almacenado como texto.',
    raw_text: trimmed.slice(0, 8000),
  };
}

function buildMockGeminiDocBlueprint(
  notebookContext: string,
): Record<string, unknown> {
  const snippet = notebookContext.trim().slice(0, 2000);
  return {
    blueprint_version: '1.0-mock',
    summary:
      'Estructura genérica (MOCK): revisar contra el repositorio cuando haya API en vivo.',
    execution_steps: [
      'Paso 1: validar contratos del motor y anclas FIFER://',
      'Paso 2: alinear Prisma y RLS según schema',
      'Paso 3: ejecutar npm run sync:gps tras cambios de rutas',
    ],
    engine_dependencies: [
      'external-bridge-engine',
      'ai-orchestrator-engine',
      'system-health',
    ],
    schema_touchpoints: ['AodsSession', 'AodsDocument', 'AodsState'],
    notebook_context_preview: snippet,
    simulated_mode_notice: MOCK_GEMINI_DOC_NOTICE,
  };
}

export class AiOrchestratorEngine {
  readonly id = AI_ORCHESTRATOR_ENGINE_ID;

  private config: OrchestratorConfig;

  constructor(config?: OrchestratorConfig) {
    this.config = { maxLoops: 5, ...config };
  }

  getHealthStatus(): AiOrchestratorHealth {
    return getAiOrchestratorHealth();
  }

  /**
   * Fase 1: cadena Vertex → OpenAI → Anthropic (`loadDecryptedVault` única fuente de credenciales LLM).
   */
  private async generateNotebookPromptViaBridge(
    planMaestro: string,
    ideationBlock?: string,
  ): Promise<{
    text: string;
    mock: boolean;
  }> {
    const vault = await loadDecryptedVault();
    const userMessage = buildPhase1UserContent(planMaestro, ideationBlock ?? '');
    const systemContent = await buildPhase1SystemPrompt();

    const result = await completeLlmWithFallback(
      {
        systemInstruction: systemContent,
        turns: [{ role: 'user', content: userMessage }],
        temperature: 0.35,
      },
      vault,
    );

    if (!result) {
      const heuristic = `${userMessage}\n\n${MOCK_NOTEBOOK_PROMPT_NOTICE}`;
      return { text: heuristic, mock: true };
    }

    return { text: result.text, mock: false };
  }

  /**
   * Fase 3: volcado NotebookLM → JSON GEMINI_DOC (Vertex → OpenAI → Anthropic).
   */
  private async structurizeNotebookToGeminiDoc(
    notebookContext: string,
  ): Promise<{ blueprint: Record<string, unknown>; mock: boolean }> {
    const vault = await loadDecryptedVault();
    const result = await completeLlmWithFallback(
      {
        systemInstruction: PHASE_3_GEMINI_DOC_SYSTEM,
        turns: [{ role: 'user', content: notebookContext }],
        temperature: 0.25,
        jsonMode: true,
      },
      vault,
    );

    if (!result) {
      return {
        blueprint: buildMockGeminiDocBlueprint(notebookContext),
        mock: true,
      };
    }

    const blueprint = parseJsonObjectFromAiText(result.text);
    return { blueprint, mock: false };
  }

  private mergeBlueprintMockLocal(
    previous: Record<string, unknown>,
    progressReport: string,
  ): Record<string, unknown> {
    const notes = Array.isArray(previous.progress_notes)
      ? [...(previous.progress_notes as string[])]
      : [];
    notes.push(progressReport.trim().slice(0, 4000));
    return {
      ...previous,
      progress_notes: notes,
      simulated_mode_notice: MOCK_GEMINI_DOC_NOTICE,
      aods_update_summary:
        'Actualización local (MOCK): progreso anexado en progress_notes.',
      source_phase: 'phase_7_update',
    };
  }

  private async mergeBlueprintWithProgressReport(
    previous: Record<string, unknown>,
    progressReport: string,
  ): Promise<{ merged: Record<string, unknown>; mock: boolean }> {
    const userContent = [
      '## Blueprint JSON actual',
      JSON.stringify(previous, null, 2),
      '',
      '## Informe de progreso (Cursor)',
      progressReport,
    ].join('\n');

    const vault = await loadDecryptedVault();
    const result = await completeLlmWithFallback(
      {
        systemInstruction: PHASE_7_UPDATE_BLUEPRINT_SYSTEM,
        turns: [{ role: 'user', content: userContent }],
        temperature: 0.2,
        jsonMode: true,
      },
      vault,
    );

    if (!result) {
      return {
        merged: this.mergeBlueprintMockLocal(previous, progressReport),
        mock: true,
      };
    }

    const merged = parseJsonObjectFromAiText(result.text);
    return { merged, mock: false };
  }

  /**
   * Fase -1: chat libre (Vertex → OpenAI → Anthropic vía `loadDecryptedVault`). Sin Prisma.
   */
  async ideate(messages: AodsIdeationMessage[]): Promise<IdeateResult> {
    if (!messages.length) {
      throw new Error('Se requiere al menos un mensaje.');
    }
    const normalized = normalizeIdeationForOpenAi(messages);
    const vault = await loadDecryptedVault();
    const result = await completeLlmWithFallback(
      {
        systemInstruction: IDEATION_SYSTEM_PROMPT,
        turns: normalized,
        temperature: 0.55,
      },
      vault,
    );

    if (result) {
      return { success: true, reply: result.text, mock: false };
    }

    const last = messages[messages.length - 1]?.content?.slice(0, 200) ?? '';
    return {
      success: true,
      mock: true,
      reply: `⚠️ [MODO SIMULADO]: sin API de IA en vivo. Refina tu idea: ${last}\n\n¿Qué motores FIFER (engines) y tablas Prisma necesitas?`,
    };
  }

  /**
   * FASE 0 (INIT): persiste sesión + estado y dispara Fase 1 en segundo plano.
   */
  async initSession(params: SessionStartParams): Promise<InitSessionResult> {
    void this.config;
    const { ownerId, planMaestro, chatHistory } = params;

    const ideationJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      chatHistory && chatHistory.length > 0
        ? (chatHistory as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;

    try {
      const session = await prisma.aodsSession.create({
        data: {
          ownerId,
          status: AodsSessionStatus.INIT,
          currentPhase: 'Fase 0: Iniciando Plan Maestro',
          state: {
            create: {
              currentStep: 'captura_plan_maestro',
              lastResponse: planMaestro,
              ideationHistory: ideationJson,
            },
          },
          messages: {
            create: {
              role: AodsMessageRole.USER,
              content: planMaestro,
            },
          },
        },
        include: { state: true },
      });

      console.log('[AODS] Iniciando Fase 1 · Fase 0 completada (sesión persistida).');

      void this.generateNotebookPrompt(session.id).catch((err: unknown) => {
        console.error(
          '[AODS] Error en Fase 1 (generateNotebookPrompt):',
          err instanceof Error ? err.message : err,
        );
      });

      return {
        success: true,
        sessionId: session.id,
        message:
          'Plan Maestro recibido. El orquestador está analizando la estrategia.',
      };
    } catch (error) {
      console.error('[AODS] Error en initSession:', error);
      throw new Error('No se pudo inicializar la sesión de orquestación.');
    }
  }

  /**
   * FASE 1: OpenAI (clave vía external-bridge-engine) genera el prompt para NotebookLM.
   */
  async generateNotebookPrompt(sessionId: string): Promise<void> {
    const session = await prisma.aodsSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        state: true,
      },
    });

    if (!session) return;

    const planMaestro =
      session.messages.find((m) => m.role === AodsMessageRole.USER)
        ?.content ?? '';

    if (!planMaestro.trim()) {
      console.warn(`[AODS] Sesión ${sessionId} sin mensaje USER; se omite Fase 1.`);
      return;
    }

    const ideationBlock = formatIdeationBlockFromJson(
      session.state?.ideationHistory ?? null,
    );

    const { text: generatedPrompt, mock } =
      await this.generateNotebookPromptViaBridge(planMaestro, ideationBlock);

    const instructions =
      'Copia el texto del campo "prompt" en NotebookLM y pega aquí la respuesta cuando el flujo lo solicite.';

    await prisma.$transaction([
      prisma.aodsDocument.create({
        data: {
          sessionId,
          type: AodsDocType.NOTEBOOK_PROMPT,
          content: {
            prompt: generatedPrompt,
            instructions,
            mock,
            source: 'phase_1_chatgpt_notebooklm',
          },
        },
      }),
      prisma.aodsMessage.create({
        data: {
          sessionId,
          role: AodsMessageRole.CHATGPT,
          content: generatedPrompt,
          metadata: { phase: 'NOTEBOOK_PROMPT', mock },
        },
      }),
      prisma.aodsSession.update({
        where: { id: sessionId },
        data: {
          status: AodsSessionStatus.NOTEBOOK,
          currentPhase: 'Fase 1: Esperando análisis de NotebookLM',
        },
      }),
      prisma.aodsState.update({
        where: { sessionId },
        data: {
          currentStep: 'notebooklm_pending',
          lastPrompt: generatedPrompt,
          needsNotebook: true,
          needsUserAction: true,
        },
      }),
    ]);
  }

  /**
   * FASE 3: IA (OpenAI o Anthropic vía bridge) analiza NotebookLM y crea el GEMINI_DOC.
   */
  async analyzeNotebookResponse(
    sessionId: string,
    notebookContext: string,
  ): Promise<AnalyzeNotebookResult> {
    void this.config;
    try {
      console.log('[AODS] Iniciando Fase 3 · structurize NotebookLM → GEMINI_DOC.');

      const { blueprint, mock } =
        await this.structurizeNotebookToGeminiDoc(notebookContext);

      const contentPayload: Record<string, unknown> = {
        ...blueprint,
        mock,
        source: 'phase_3_gemini_doc',
      };
      if (mock) {
        contentPayload.simulated_mode_notice = MOCK_GEMINI_DOC_NOTICE;
      }

      const contentJson =
        JSON.parse(JSON.stringify(contentPayload)) as Prisma.InputJsonValue;

      await prisma.$transaction(async (tx) => {
        await tx.aodsMessage.create({
          data: {
            sessionId,
            role: AodsMessageRole.USER,
            content: notebookContext,
            metadata: { source: 'notebooklm_raw' },
          },
        });

        const versionAgg = await tx.aodsDocument.aggregate({
          where: { sessionId, type: AodsDocType.GEMINI_DOC },
          _max: { version: true },
        });
        const nextVersion = (versionAgg._max.version ?? 0) + 1;

        await tx.aodsDocument.create({
          data: {
            sessionId,
            type: AodsDocType.GEMINI_DOC,
            content: contentJson,
            version: nextVersion,
          },
        });

        await tx.aodsMessage.create({
          data: {
            sessionId,
            role: AodsMessageRole.CHATGPT,
            content:
              'Blueprint técnico (GEMINI_DOC) generado a partir del contexto de NotebookLM.',
            metadata: { phase: 'GEMINI_DOC', mock },
          },
        });

        await tx.aodsSession.update({
          where: { id: sessionId },
          data: {
            status: AodsSessionStatus.GEMINI,
            currentPhase:
              'Fase 3: GEMINI_DOC generado. Esperando activación de Cursor.',
          },
        });

        await tx.aodsState.update({
          where: { sessionId },
          data: {
            currentStep: 'gemini_doc_ready',
            needsNotebook: false,
            needsUserAction: true,
          },
        });
      });

      return {
        success: true,
        message: 'Análisis completado. GEMINI_DOC listo.',
      };
    } catch (error) {
      console.error('[AODS] Error en Fase 3:', error);
      throw new Error('Fallo al analizar la respuesta de NotebookLM.');
    }
  }

  /**
   * FASE 4: genera el prompt que inicia el loop en Cursor (Gemini activator).
   */
  async generateGeminiActivator(
    sessionId: string,
  ): Promise<GenerateGeminiActivatorResult> {
    try {
      const session = await prisma.aodsSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          documents: {
            where: { type: AodsDocType.GEMINI_DOC },
            orderBy: { version: 'desc' },
            take: 1,
          },
          state: true,
        },
      });

      if (!session || !session.state) {
        throw new Error('Sesión o estado no encontrado.');
      }
      if (session.documents.length === 0) {
        throw new Error('Falta el GEMINI_DOC. Ejecute la Fase 3 primero.');
      }

      const planMaestro =
        session.messages.find((m) => m.role === AodsMessageRole.USER)
          ?.content ?? '';
      const geminiDoc = session.documents[0].content;

      const activatorPrompt = `
# INSTRUCCIÓN DE INICIO AODS - MODO EJECUCIÓN
Eres Gemini, operando dentro de Cursor AI bajo las reglas del .cursorrules de FIFER.

## 1. PLAN MAESTRO:
${planMaestro}

## 2. CONTEXTO TÉCNICO Y ARQUITECTURA (aprobado vía pipeline AODS):
${JSON.stringify(geminiDoc, null, 2)}

## 3. PROTOCOLO DE LOOP:
Tu tarea es ejecutar esto paso a paso.
- No escribas todo el código de una vez.
- En este primer mensaje, entrega SOLO la estructura de carpetas a modificar y el código del PRIMER paso.
- Aplica estrictamente el protocolo Zero Technical Debt (.cursorrules §26).
- Al terminar el paso, pregunta al usuario: "¿Implementación exitosa? Responde OK para seguir con el paso 2, o indica el error".

Ejecuta.
`.trim();

      await prisma.$transaction([
        prisma.aodsState.update({
          where: { sessionId },
          data: {
            lastPrompt: activatorPrompt,
            needsUserAction: true,
            currentStep: 'esperando_copiado_a_cursor',
          },
        }),
        prisma.aodsSession.update({
          where: { id: sessionId },
          data: {
            status: AodsSessionStatus.LOOP,
            currentPhase:
              'Fase 4: Activador generado. Usuario debe llevarlo a Cursor.',
          },
        }),
      ]);

      return {
        success: true,
        activatorPrompt,
      };
    } catch (error) {
      console.error('[AODS] Error en Fase 4:', error);
      throw new Error('Fallo al generar el activador de Gemini.');
    }
  }

  /**
   * FASE 7 (Update System): informe de Cursor → nueva versión GEMINI_DOC (transacción atómica en BD).
   */
  async updateGeminiDoc(
    sessionId: string,
    progressReport: string,
  ): Promise<UpdateGeminiDocResult> {
    void this.config;
    const trimmed = progressReport.trim();
    if (!trimmed) {
      throw new Error('El informe de progreso no puede estar vacío.');
    }

    const latest = await prisma.aodsDocument.findFirst({
      where: { sessionId, type: AodsDocType.GEMINI_DOC },
      orderBy: { version: 'desc' },
    });

    if (!latest) {
      throw new Error('No hay GEMINI_DOC en la sesión. Ejecute la Fase 3 primero.');
    }

    const previousJson = latest.content;
    if (
      previousJson === null ||
      typeof previousJson !== 'object' ||
      Array.isArray(previousJson)
    ) {
      throw new Error('GEMINI_DOC inválido: se esperaba un objeto JSON.');
    }
    const previous = { ...(previousJson as Record<string, unknown>) };

    const { merged, mock } = await this.mergeBlueprintWithProgressReport(
      previous,
      trimmed,
    );

    const summaryRaw = merged.aods_update_summary;
    const summaryText =
      typeof summaryRaw === 'string' && summaryRaw.trim()
        ? summaryRaw.trim()
        : mock
          ? 'Blueprint actualizado (MOCK): progreso registrado localmente.'
          : 'Blueprint actualizado a partir del informe de Cursor.';

    const contentPayload: Record<string, unknown> = {
      ...merged,
      mock,
      source: 'phase_7_update',
      prior_version: latest.version,
    };
    if (mock) {
      contentPayload.simulated_mode_notice = MOCK_GEMINI_DOC_NOTICE;
    }

    const contentJson =
      JSON.parse(JSON.stringify(contentPayload)) as Prisma.InputJsonValue;

    const result = await prisma.$transaction(async (tx) => {
      const versionAgg = await tx.aodsDocument.aggregate({
        where: { sessionId, type: AodsDocType.GEMINI_DOC },
        _max: { version: true },
      });
      const nextVersion = (versionAgg._max.version ?? 0) + 1;

      await tx.aodsMessage.create({
        data: {
          sessionId,
          role: AodsMessageRole.USER,
          content: trimmed,
          metadata: { phase: 'CURSOR_PROGRESS', source: 'cursor_report' },
        },
      });

      await tx.aodsDocument.create({
        data: {
          sessionId,
          type: AodsDocType.GEMINI_DOC,
          content: contentJson,
          version: nextVersion,
        },
      });

      await tx.aodsMessage.create({
        data: {
          sessionId,
          role: AodsMessageRole.SYSTEM,
          content: summaryText,
          metadata: {
            phase: 'GEMINI_DOC_UPDATE',
            version: nextVersion,
            mock,
          },
        },
      });

      await tx.aodsSession.update({
        where: { id: sessionId },
        data: {
          status: AodsSessionStatus.LOOP,
          currentPhase:
            'Fase 7: Blueprint actualizado. Listo para siguiente paso en Cursor.',
        },
      });

      await tx.aodsState.update({
        where: { sessionId },
        data: {
          currentStep: 'cursor_progress_merged',
          lastResponse: summaryText,
          needsUserAction: true,
        },
      });

      return { version: nextVersion };
    });

    return {
      success: true,
      version: result.version,
      message: `Blueprint actualizado a v${result.version}. Listo para el siguiente paso.`,
    };
  }

  /**
   * FASE 9 (Deploy): POST opcional al deploy hook de Vercel; estado DEPLOY en BD (transacción atómica).
   */
  async triggerDeployment(sessionId: string): Promise<TriggerDeploymentResult> {
    void this.config;

    const session = await prisma.aodsSession.findUnique({
      where: { id: sessionId },
      include: { state: true },
    });
    if (!session) {
      throw new Error('Sesión no encontrada.');
    }
    if (!session.state) {
      throw new Error('Estado AODS no encontrado para la sesión.');
    }

    const vault = await loadDecryptedVault();
    const rawHook = vault.VERCEL_DEPLOY_HOOK?.trim() ?? '';
    const hookUrl = rawHook.startsWith('http') ? rawHook : '';

    let deployHookAttempted = false;
    let deployHookSucceeded = false;
    if (hookUrl) {
      deployHookAttempted = true;
      try {
        const res = await fetch(hookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          cache: 'no-store',
        });
        deployHookSucceeded = res.ok;
      } catch {
        deployHookSucceeded = false;
      }
    }

    const systemContent = 'Despliegue automatizado iniciado en Vercel.';

    await prisma.$transaction([
      prisma.aodsSession.update({
        where: { id: sessionId },
        data: {
          status: AodsSessionStatus.DEPLOY,
          currentPhase: 'Fase 9: Desplegando en Producción',
        },
      }),
      prisma.aodsMessage.create({
        data: {
          sessionId,
          role: AodsMessageRole.SYSTEM,
          content: systemContent,
          metadata: {
            phase: 'DEPLOY',
            deployHookAttempted,
            deployHookSucceeded,
          },
        },
      }),
      prisma.aodsState.update({
        where: { sessionId },
        data: {
          currentStep: 'vercel_deploy_triggered',
          lastResponse: systemContent,
          needsUserAction: true,
        },
      }),
    ]);

    const message = deployHookAttempted
      ? deployHookSucceeded
        ? 'Build solicitado en Vercel vía deploy hook.'
        : 'Estado DEPLOY registrado; el deploy hook no respondió OK (revisar Vercel).'
      : 'Despliegue registrado; sin VERCEL_DEPLOY_HOOK HTTP (solo cambio de estado).';

    return {
      success: true,
      message,
      deployHookAttempted,
      deployHookSucceeded,
    };
  }

  async processCursorFeedback(_sessionId: string, _feedback: string): Promise<void> {
    void _sessionId;
    void _feedback;
  }
}
