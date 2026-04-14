import { z } from 'zod';

import { loadDecryptedVault } from '@/lib/bridge-vault';

import { completeLlmWithFallback } from './llm/gateway';

/**
 * 🗺️ ESTRUCTURA DE DESCUBRIMIENTO (Basada en Ley §29)
 * Este mapa refleja directamente las capacidades declaradas en los archivos _xray_ROUTING.md
 */
interface AppDiscovery {
  app: 'dom' | 'finanzas' | 'redes-sociales' | 'war-room';
  keywords: string[];
  path: string;
}

const GLOBAL_APP_MAP: AppDiscovery[] = [
  { 
    app: 'dom', 
    path: 'dom',
    // Añadida la palabra 'dom' como keyword principal
    keywords: ['dom', 'oguc', 'lguc', 'expediente', 'municipal', 'permiso', 'edificacion', 'minvu', 'recepcion', 'obra', 'normativa', 'formulario dom', 'ley del mono'] 
  },
  { 
    app: 'finanzas', 
    path: 'finanzas',
    // Añadida la palabra 'finanzas' como keyword principal
    keywords: ['finanzas', 'pago', 'factura', 'flujo', 'caja', 'cashflow', 'banco', 'fintoc', 'saldo', 'dinero', 'egreso', 'ingreso', 'contabilidad', 'gasto', 'presupuesto'] 
  },
  { 
    app: 'redes-sociales', 
    path: 'redes-sociales',
    // Añadidas keywords principales
    keywords: ['redes sociales', 'redes', 'marketing', 'campaña', 'instagram', 'facebook', 'tiktok', 'post', 'publicacion', 'ads', 'anuncio', 'social', 'contenido'] 
  },
  { 
    app: 'war-room', 
    path: 'desarrollador',
    // Añadida 'war room' y 'desarrollador'
    keywords: ['war room', 'desarrollador', 'latencia', 'ping', 'salud', 'sistema', 'telemetria', 'desarrollo', 'debug', 'env', 'llaves', 'api', 'observabilidad', 'health'] 
  }
];

const intentClassificationSchema = z.object({
  action: z.enum(['EXECUTE', 'NAVIGATE']),
  targetApp: z.enum(['dom', 'finanzas', 'redes-sociales', 'war-room']).optional(),
  reasoning: z.string().min(1),
});

export type IntentClassification = z.infer<typeof intentClassificationSchema>;

const CLASSIFY_INTENT_SYSTEM_PROMPT = `Eres un router de intenciones de FIFER (AODS).
Tu misión es TELETRANSPORTAR al usuario. 

REGLAS DE ORO:
1. Si el usuario menciona el nombre de otra aplicación o términos técnicos de otra aplicación (ej. "finanzas", "pago", "OGUC", "marketing"), DEBES responder NAVIGATE.
2. NO intentes relacionar el término con el contexto actual. Si dice "finanzas" estando en "dom", NO asumas que quiere finanzas del dom; asume que quiere IR a la App de Finanzas.
3. El "currentContext" es solo para saber si YA estamos en el destino. Si el destino detectado es igual al currentContext, responde EXECUTE.

Responde SOLO con JSON válido:
{"action":"NAVIGATE","targetApp":"nombre_app","reasoning":"..."}
o
{"action":"EXECUTE","reasoning":"..."}`;

function classifyIntentHeuristic(
  prompt: string,
  currentContext: string,
): IntentClassification {
  const text = `${prompt}`.toLowerCase();
  const normalizedContext = currentContext.toLowerCase();

  for (const discovery of GLOBAL_APP_MAP) {
    const hasMatch = discovery.keywords.some(keyword => text.includes(keyword));

    if (hasMatch) {
      // Si el match es con una app que no es la actual, navegamos.
      // Comprobamos tanto el id de la app como su path físico.
      if (!normalizedContext.includes(discovery.app) && !normalizedContext.includes(discovery.path)) {
        return {
          action: 'NAVIGATE',
          targetApp: discovery.app,
          reasoning: `⚡ [Fast-Path] Palabra clave detectada: "${discovery.app}". Redirigiendo desde "${currentContext}".`,
        };
      }
    }
  }

  return {
    action: 'EXECUTE',
    reasoning: 'Sin orden de navegación clara en Fast-Path.',
  };
}

export async function classifyIntent(
  prompt: string,
  currentContext: string,
): Promise<IntentClassification> {
  
  // 🚀 1. FAST-PATH (Latencia Cero)
  const fastMatch = classifyIntentHeuristic(prompt, currentContext);
  
  if (fastMatch.action === 'NAVIGATE') {
    return fastMatch;
  }

  // 🧠 2. SLOW-PATH (LLM para lenguaje natural complejo)
  const userPrompt = [
    `currentContext: ${currentContext}`,
    `prompt: ${prompt}`,
    'targetApps permitidos: dom, finanzas, redes-sociales, war-room',
  ].join('\n');

  const vault = await loadDecryptedVault();
  const result = await completeLlmWithFallback(
    {
      systemInstruction: CLASSIFY_INTENT_SYSTEM_PROMPT,
      turns: [{ role: 'user', content: userPrompt }],
      temperature: 0,
      jsonMode: true,
    },
    vault,
  );

  if (!result) return fastMatch;

  try {
    const parsed = JSON.parse(result.text);
    const validated = intentClassificationSchema.safeParse(parsed);
    if (validated.success) {
        // Doble verificación: si el LLM dice que quiere navegar a donde ya está, forzamos EXECUTE
        if (validated.data.action === 'NAVIGATE' && validated.data.targetApp && currentContext.includes(validated.data.targetApp)) {
            return { action: 'EXECUTE', reasoning: 'Ya estamos en la app solicitada.' };
        }
        return validated.data;
    }
  } catch {
    // fallback
  }

  return fastMatch;
}

export function resolveTargetAppPath(targetApp: IntentClassification['targetApp']): string {
  const discovery = GLOBAL_APP_MAP.find(a => a.app === targetApp);
  return discovery ? discovery.path : '';
}