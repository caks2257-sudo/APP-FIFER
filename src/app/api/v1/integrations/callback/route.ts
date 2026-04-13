import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Importaciones de los manejadores (Asegúrate de crear estos archivos en src/lib/integrations/ con sus respectivas funciones)
// Si aún no los has creado, puedes comentar estas 4 líneas temporalmente.
import { handleTaskletCallback } from '@/lib/integrations/tasklet';
import { handleFintocCallback } from '@/lib/integrations/fintoc';
import { handleMakeCallback } from '@/lib/integrations/make';
import { handleLanggraphCallback } from '@/lib/integrations/langgraph';

export const dynamic = 'force-dynamic';

const PROVIDERS = ['tasklet', 'fintoc', 'make', 'langgraph'] as const;
type IntegrationCallbackProvider = (typeof PROVIDERS)[number];

const MAX_BODY_BYTES = 512 * 1024;
const MAX_BODY_TEXT_STORE = 65_000;

const SENSITIVE_HEADER_SNIPPETS = [
  'authorization',
  'cookie',
  'x-fintoc-signature',
  'x-tasklet-signature',
  'x-make-signature',
  'x-langchain-signature',
  'signature',
];

function isProvider(value: string | undefined): value is IntegrationCallbackProvider {
  return (
    value != null &&
    (PROVIDERS as readonly string[]).includes(value.toLowerCase())
  );
}

/**
 * Resolución del origen: prioridad explícita (query / cabecera FIFER) y heurísticas por proveedor.
 */
function resolveIntegrationProvider(request: NextRequest): IntegrationCallbackProvider | null {
  const url = request.nextUrl;
  const q = url.searchParams.get('provider')?.trim().toLowerCase();
  if (isProvider(q)) return q;

  const integrator = request.headers.get('x-fifer-integration')?.trim().toLowerCase();
  if (isProvider(integrator)) return integrator;

  if (
    request.headers.get('fintoc-signature') ||
    request.headers.get('x-fintoc-signature') ||
    request.headers.get('x-fintoc-event')
  ) {
    return 'fintoc';
  }

  if (
    request.headers.get('x-tasklet-signature') ||
    request.headers.get('x-tasklet-event') ||
    request.headers.get('x-tasklet-delivery')
  ) {
    return 'tasklet';
  }

  if (
    request.headers.get('x-make-webhook') ||
    request.headers.get('x-make-webhook-id')
  ) {
    return 'make';
  }

  if (
    request.headers.get('x-langchain-signature') || 
    url.searchParams.get('provider') === 'langgraph'
  ) {
    return 'langgraph';
  }

  const ua = request.headers.get('user-agent') ?? '';
  if (/make\.com|make\/production|Make-Automation/i.test(ua)) {
    return 'make';
  }

  return null;
}

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    const sensitive = SENSITIVE_HEADER_SNIPPETS.some((s) => lk.includes(s));
    if (sensitive) {
      out[key] = '[redacted]';
      return;
    }
    out[key] = value.length > 512 ? `${value.slice(0, 512)}…` : value;
  });
  return out;
}

function searchParamsToRecord(url: URL): Record<string, string> | null {
  const entries = [...url.searchParams.entries()];
  if (entries.length === 0) return null;
  return Object.fromEntries(entries);
}

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() ?? null;
}

async function readBodyPayload(request: NextRequest): Promise<{
  bodyJson: unknown | null;
  bodyText: string | null;
}> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return {
      bodyJson: null,
      bodyText: '[omitted: payload demasiado grande]',
    };
  }

  const raw = await request.arrayBuffer().catch(() => null);
  if (!raw || raw.byteLength === 0) {
    return { bodyJson: null, bodyText: null };
  }

  const slice = raw.byteLength > MAX_BODY_BYTES ? raw.slice(0, MAX_BODY_BYTES) : raw;
  const text = new TextDecoder('utf-8', { fatal: false }).decode(slice);

  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const parsed = JSON.parse(text) as unknown;
      return { bodyJson: parsed, bodyText: null };
    } catch {
      return {
        bodyJson: null,
        bodyText:
          text.length > MAX_BODY_TEXT_STORE
            ? `${text.slice(0, MAX_BODY_TEXT_STORE)}…`
            : text,
      };
    }
  }

  return {
    bodyJson: null,
    bodyText:
      text.length > MAX_BODY_TEXT_STORE
        ? `${text.slice(0, MAX_BODY_TEXT_STORE)}…`
        : text,
  };
}

/**
 * Punto de extensión: ejecutar después del insert en BD (en cola, side-effects, etc.).
 */
async function processIntegrationCallback(
  provider: IntegrationCallbackProvider,
  eventId: string,
  request: NextRequest,
  bodyJson: unknown | null,
  bodyText: string | null,
): Promise<void> {
  const payload = bodyJson || bodyText;

  // Derivamos el trabajo según el proveedor a su respectivo controlador
  switch (provider) {
    case 'tasklet':
      await handleTaskletCallback(eventId, payload);
      break;
    case 'fintoc':
      await handleFintocCallback(eventId, payload);
      break;
    case 'make':
      await handleMakeCallback(eventId, payload);
      break;
    case 'langgraph':
      await handleLanggraphCallback(eventId, payload);
      break;
  }

  // Marcamos el evento como procesado exitosamente en la base de datos
  await prisma.integrationCallbackEvent.update({
    where: { id: eventId },
    data: { processed: true }
  });
}

async function handleCallback(request: NextRequest): Promise<NextResponse> {
  const provider = resolveIntegrationProvider(request);
  if (!provider) {
    return NextResponse.json(
      {
        error:
          'No se pudo identificar el proveedor. Usa ?provider=tasklet|fintoc|make|langgraph, la cabecera X-Fifer-Integration, o las cabeceras nativas del proveedor.',
      },
      { status: 400 },
    );
  }

  const { bodyJson, bodyText } = await readBodyPayload(request);

  const row = await prisma.integrationCallbackEvent.create({
    data: {
      provider,
      method: request.method,
      requestPath: request.nextUrl.pathname,
      queryJson: searchParamsToRecord(request.nextUrl) ?? undefined,
      headersJson: sanitizeHeaders(request.headers),
      bodyJson: bodyJson === null ? undefined : bodyJson,
      bodyText: bodyText ?? undefined,
      clientIp: clientIp(request) ?? undefined,
    },
  });

  let processed = true;
  let processWarning: string | undefined;
  try {
    await processIntegrationCallback(
      provider,
      row.id,
      request,
      bodyJson,
      bodyText,
    );
  } catch (err) {
    console.error('[integrations/callback] post-process error', err);
    processed = false;
    processWarning =
      err instanceof Error ? err.message : 'Falló el procesamiento posterior.';
  }

  return NextResponse.json({
    ok: true,
    id: row.id,
    provider,
    processed,
    ...(processWarning ? { warning: processWarning } : {}),
  });
}

export async function GET(request: NextRequest) {
  return handleCallback(request);
}

export async function POST(request: NextRequest) {
  return handleCallback(request);
}

export async function PUT(request: NextRequest) {
  return handleCallback(request);
}