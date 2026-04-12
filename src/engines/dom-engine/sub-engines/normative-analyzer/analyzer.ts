/**
 * Análisis de cabida arquitectónica base vía IA resuelta por `external-bridge-engine` (claves OPENAI / ANTHROPIC).
 */

import type { ExternalBridgeEngineApi } from '@/engines/external-bridge-engine';
import {
  domAnalisisResponseSchema,
  type DomAnalisisRequest,
  type DomAnalisisResponse,
} from '@/types/schemas';
import { EngineRegistry } from '@/registry/engine-registry';

import { DOM_AUDITOR_SYSTEM_PROMPT } from './audit-prompt';

function parseJsonFromAiOutput(text: string): unknown {
  const trimmed = text.trim();
  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = block ? block[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('No se pudo extraer JSON de la respuesta del modelo');
  }
}

function buildUserPrompt(input: DomAnalisisRequest, superficieMaximaTeorica: number): string {
  return [
    `### Rol del sistema`,
    DOM_AUDITOR_SYSTEM_PROMPT,
    ``,
    `### Datos de entrada (JSON)`,
    JSON.stringify(input, null, 2),
    ``,
    `### Cálculo obligatorio`,
    `superficieMaximaEdificable (number) = superficieTerreno * coeficienteConstructibilidad = ${superficieMaximaTeorica} (verifica y redondea solo si aplicas criterio de redondeo explícito en observaciones).`,
    `Valida ocupación de suelo ${input.ocupacionSuelo}% frente al destino "${input.destino}".`,
    ``,
    `### Formato de salida`,
    `Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto antes o después) con exactamente estas claves:`,
    `{"factible": boolean, "superficieMaximaEdificable": number, "observaciones": string | string[]}`,
    `Las observaciones deben incluir citas normativas a OGUC/LGUC donde corresponda (artículos o referencias generales si no tienes número exacto).`,
  ].join('\n');
}

export function buildMockCabidaResponse(
  input: DomAnalisisRequest,
  superficieMaximaTeorica: number,
): DomAnalisisResponse {
  const rounded = Math.round(superficieMaximaTeorica * 100) / 100;
  return {
    factible: true,
    superficieMaximaEdificable: rounded,
    observaciones: [
      `[MOCK] Simulación exitosa sin llamada a modelo: cabida teórica ${rounded} m² (superficie × coef.).`,
      `Destino declarado: ${input.destino}; ocupación de suelo ${input.ocupacionSuelo}% — referencia orientativa OGUC/LGUC, sin sustituir revisión municipal.`,
    ],
  };
}

async function callOpenAiJson(
  userPrompt: string,
  apiKey: string,
): Promise<DomAnalisisResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: DOM_AUDITOR_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  const raw = parseJsonFromAiOutput(text);
  const parsed = domAnalisisResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Salida OpenAI no cumple esquema: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function callAnthropicJson(
  userPrompt: string,
  apiKey: string,
): Promise<DomAnalisisResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      system: DOM_AUDITOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text =
    data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') ?? '';
  const raw = parseJsonFromAiOutput(text);
  const parsed = domAnalisisResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Salida Anthropic no cumple esquema: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Ejecuta análisis normativo usando claves IA resueltas vía `external-bridge-engine` (BridgeProxy).
 * Si ambas claves están en MOCK, devuelve resultado simulado exitoso.
 */
export async function analyzeNormativeCabida(
  input: DomAnalisisRequest,
  vault: Partial<Record<string, string>> | undefined,
): Promise<DomAnalisisResponse> {
  const bridge = EngineRegistry.use<ExternalBridgeEngineApi>('external-bridge-engine');
  const proxy = bridge.buildProxy(vault);
  const openai = proxy.resolveKey('OPENAI_API_KEY');
  const anthropic = proxy.resolveKey('ANTHROPIC_API_KEY');

  const superficieMaximaTeorica = input.superficieTerreno * input.coeficienteConstructibilidad;
  const userPrompt = buildUserPrompt(input, superficieMaximaTeorica);

  if (openai.mode === 'MOCK' && anthropic.mode === 'MOCK') {
    return buildMockCabidaResponse(input, superficieMaximaTeorica);
  }

  if (openai.mode === 'PROD' && openai.secret) {
    return callOpenAiJson(userPrompt, openai.secret);
  }

  if (anthropic.mode === 'PROD' && anthropic.secret) {
    return callAnthropicJson(userPrompt, anthropic.secret);
  }

  return buildMockCabidaResponse(input, superficieMaximaTeorica);
}
