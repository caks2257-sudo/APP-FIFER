import type { LlmCompletionInput, LlmProviderAdapter, OrchestratorLlmSecrets } from '../types';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export const openAiLlmAdapter: LlmProviderAdapter = {
  id: 'openai',

  async complete(input: LlmCompletionInput, secrets: OrchestratorLlmSecrets) {
    const apiKey = secrets.openaiApiKey;
    if (!apiKey) {
      throw new Error('openai: sin OPENAI_API_KEY en External Bridge vault');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (input.systemInstruction?.trim()) {
      messages.push({ role: 'system', content: input.systemInstruction.trim() });
    }
    for (const t of input.turns) {
      messages.push({ role: t.role, content: t.content });
    }

    const body: Record<string, unknown> = {
      model: secrets.openaiModel,
      messages,
      temperature: input.temperature ?? 0.35,
    };
    if (input.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      throw new Error(`openai: HTTP ${res.status} ${raw.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('openai: respuesta vacía');
    }
    return text;
  },
};
