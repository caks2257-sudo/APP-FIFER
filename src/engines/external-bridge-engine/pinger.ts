import { performance } from 'node:perf_hooks';

const LATENCY_TIMEOUT_MS = 2_000;

function resolveIntegrationBaseUrl(integrationId: string): string | null {
  switch (integrationId) {
    case 'tasklet':
      return process.env.TASKLET_WEBHOOK_URL?.trim() || 'https://tasklet.ai';
    case 'fintoc':
      return 'https://api.fintoc.com';
    case 'make':
      return process.env.MAKE_WEBHOOK_URL?.trim() || 'https://hook.make.com';
    case 'langgraph':
      return process.env.LANGGRAPH_WEBHOOK_URL?.trim() || 'https://api.langchain.com';
    default:
      return null;
  }
}

/**
 * Mide micro-latencia de integración.
 * - MOCK => 0
 * - LIVE => ms de request HEAD (timeout 2s)
 * - error/timeout => -1
 */
export async function measureIntegrationLatency(
  integrationId: string,
  status: 'LIVE' | 'MOCK',
): Promise<number> {
  if (status === 'MOCK') {
    return 0;
  }

  const url = resolveIntegrationBaseUrl(integrationId);
  if (!url) {
    return -1;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, LATENCY_TIMEOUT_MS);

  try {
    const startedAt = performance.now();
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    const elapsed = Math.round(performance.now() - startedAt);
    return response.ok ? elapsed : -1;
  } catch {
    return -1;
  } finally {
    clearTimeout(timeoutId);
  }
}
