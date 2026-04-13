import type { LlmCompletionInput, LlmProviderAdapter, OrchestratorLlmSecrets } from '../types';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export const anthropicLlmAdapter: LlmProviderAdapter = {
  id: 'anthropic',

  async complete(input: LlmCompletionInput, secrets: OrchestratorLlmSecrets) {
    const apiKey = secrets.anthropicApiKey;
    if (!apiKey) {
      throw new Error('anthropic: sin ANTHROPIC_API_KEY en External Bridge vault');
    }

    const payload: Record<string, unknown> = {
      model: secrets.anthropicModel,
      max_tokens: 4096,
      messages: input.turns.map((t) => ({
        role: t.role,
        content: t.content,
      })),
      temperature: input.temperature ?? 0.35,
    };
    const sys = input.systemInstruction?.trim();
    if (sys) payload.system = sys;

    const res = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      throw new Error(`anthropic: HTTP ${res.status} ${raw.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') ??
      '';
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('anthropic: respuesta vacía');
    }
    return trimmed;
  },
};
