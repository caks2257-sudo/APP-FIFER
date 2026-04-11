import { NextRequest, NextResponse } from 'next/server';

import '@/engines/ai-fallback-cascade';
import {
  AiCascadeExhaustedError,
  type AiFallbackCascadeEngine,
} from '@/engines/ai-fallback-cascade';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { prisma } from '@/lib/prisma';
import { EngineRegistry } from '@/registry/engine-registry';
import {
  domAnalisisRequestSchema,
  domAnalisisResponseSchema,
} from '@/types/schemas';
import type { CoreProfile } from '@/types/user-dna';

export const dynamic = 'force-dynamic';

const DOM_AUDITOR_SYSTEM_PROMPT = [
  'Eres un Auditor Normativo Chileno experto en OGUC (Ordenanza General de Urbanismo y Construcciones)',
  'y LGUC (Ley General de Urbanismo y Construcciones).',
  'Debes interpretar parámetros de predio de forma prudente, citar artículos o instrumentos cuando corresponda,',
  'y distinguir entre cálculo geométrico básico y exigencias que requieren plan regulador o normativa local.',
  'Superficie máxima edificable numérica = superficieTerreno × coeficienteConstructibilidad (expresa el resultado en las mismas unidades que superficieTerreno).',
  'La ocupación de suelo (%) debe evaluarse respecto a coherencia con destino y límites urbanísticos típicos; si no es factible, factible=false.',
  'Responde SIEMPRE en español técnico.',
].join(' ');

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

function coreProfileFromUserRow(name: string, tier: string, role: string): CoreProfile {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    nombres: parts[0] ?? 'Usuario',
    apellidoPaterno: parts.slice(1).join(' ') || 'FIFER',
    apellidoMaterno: '',
    nacionalidad: 'Chilena',
    fechaNacimiento: '1990-01-01',
    rut: '12.345.678-5',
    tier: tier === 'pro' ? 'pro' : 'free',
    role,
  };
}

/**
 * POST: análisis normativo paramétrico vía motor `ai-fallback-cascade`. Body validado con `domAnalisisRequestSchema`.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = domAnalisisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: 'Usuario sin fila en Prisma; ejecute seed o sincronice identidad.' },
      { status: 404 },
    );
  }

  const core = coreProfileFromUserRow(dbUser.name, dbUser.tier, dbUser.role);

  const superficieMaximaTeorica = input.superficieTerreno * input.coeficienteConstructibilidad;

  const userPrompt = [
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

  const aiEngine = EngineRegistry.use<AiFallbackCascadeEngine>('ai-fallback');

  try {
    const { finalOutput } = await aiEngine.processInsight(userPrompt, core, {
      meta: { moduleId: 'dom-normativa', boxId: 'analisis-parametrico' },
    });

    let raw: unknown;
    try {
      raw = parseJsonFromAiOutput(finalOutput);
    } catch (e) {
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : 'Respuesta del modelo no interpretable',
          raw: finalOutput.slice(0, 2000),
        },
        { status: 502 },
      );
    }

    const outParsed = domAnalisisResponseSchema.safeParse(raw);
    if (!outParsed.success) {
      return NextResponse.json(
        {
          error: 'La respuesta del modelo no cumple el esquema esperado',
          issues: outParsed.error.flatten(),
          raw: finalOutput.slice(0, 2000),
        },
        { status: 502 },
      );
    }

    return NextResponse.json(outParsed.data);
  } catch (error) {
    if (error instanceof AiCascadeExhaustedError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          tierErrors: error.tierErrors,
        },
        { status: 503 },
      );
    }
    console.error('[api/v1/dom/analisis]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    );
  }
}
