import type { BoxId } from '@/registry/box-catalog';
import { boxCatalog } from '@/registry/box-catalog';
import {
  sharedChatEnvelopeSchema,
  type LayoutCommand,
} from '@/types/layout-command';

const FENCE_JSON = /```(?:json)?\s*([\s\S]*?)```/i;

export type ParsedSharedChatAi = {
  reply: string;
  layoutCommand?: LayoutCommand;
  /** `true` si se parseó JSON válido con `sharedChatEnvelopeSchema` (no aplicar heurística de UI). */
  structured: boolean;
};

/**
 * Intenta extraer un sobre JSON `{ reply, layoutCommand }` de la salida textual de la cascada IA.
 */
export function parseSharedChatAiEnvelope(raw: string): ParsedSharedChatAi {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(FENCE_JSON);
  const jsonCandidate = fenceMatch?.[1]?.trim() ?? (trimmed.startsWith('{') ? trimmed : null);
  if (jsonCandidate) {
    try {
      const parsed: unknown = JSON.parse(jsonCandidate);
      const envelope = sharedChatEnvelopeSchema.safeParse(parsed);
      if (envelope.success) {
        return {
          reply: envelope.data.reply,
          layoutCommand: envelope.data.layoutCommand ?? undefined,
          structured: true,
        };
      }
    } catch {
      /* continuar con texto plano */
    }
  }
  return { reply: raw, structured: false };
}

const HEURISTIC_PATTERNS: Array<{ test: RegExp; boxId: BoxId }> = [
  { test: /(salud|health|monitor)\s*(del\s*)?(sistema|system)?/i, boxId: 'system-health-monitor' },
  { test: /(liquidez|liquidity|forecast)/i, boxId: 'finance-liquidity-forecast' },
  { test: /(flujo\s*de\s*caja|cash\s*flow|gr[aá]fico\s*financ)/i, boxId: 'finance-cashflow-chart' },
  { test: /(orquestador|orchestrator|ia\s*orquest)/i, boxId: 'ai-orchestrator-box' },
  { test: /(ingesta|documento|oguc|lguc)/i, boxId: 'content-ingestion-form' },
  { test: /(contrato|chicureo)/i, boxId: 'fifer-contratos-main' },
  { test: /(inmobiliar)/i, boxId: 'fifer-inmobiliario-main' },
  { test: /(mis\s*bots|misbots|bots)/i, boxId: 'fifer-misbots-main' },
];

/**
 * Si el mensaje del usuario implica una acción visual y no hay comando explícito, sugiere `add`.
 */
export function inferLayoutCommandFromUserMessage(message: string): LayoutCommand | undefined {
  const m = message.trim();
  if (m.length < 3) return undefined;
  const wantsUi =
    /(añade|agrega|muestra|abre|pon|coloca|incrusta|despliega|añadir|agregar|mostrar)/i.test(m) ||
    /(widget|panel|box|caja|dashboard|grilla)/i.test(m);
  if (!wantsUi) return undefined;

  for (const { test, boxId } of HEURISTIC_PATTERNS) {
    if (test.test(m)) {
      return { action: 'add', boxId };
    }
  }
  return undefined;
}

export function buildSharedChatSystemPrompt(appContext: string): string {
  const ids = Object.keys(boxCatalog).join(', ');
  return [
    `Eres el copiloto efímero de FIFER. Estás asistiendo al usuario en el módulo: [${appContext}]. Sé breve y al grano.`,
    '',
    'Cuando el usuario pida añadir, mostrar, abrir o colocar un panel, widget o vista en el dashboard,',
    'responde SOLO con un JSON válido (sin texto fuera del JSON) con esta forma:',
    '{"reply":"<texto en español para el usuario>","layoutCommand":null}',
    'o, si debe crearse o ajustarse un box:',
    '{"reply":"<texto>","layoutCommand":{"action":"add","boxId":"<id>","colSpan":<1-12 opcional>,"rowSpan":<1-24 opcional>}}',
    'Acciones: add (requiere boxId), remove (requiere widgetId), resize (requiere widgetId y colSpan y/o rowSpan).',
    `boxId permitidos: ${ids}.`,
    'Si el mensaje no implica cambios de UI, usa layoutCommand: null.',
  ].join('\n');
}
