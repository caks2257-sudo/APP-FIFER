import type { LlmCompletionInput, LlmProviderAdapter, OrchestratorLlmSecrets } from '../types';

/**
 * Vertex AI (Gemini) como proveedor prioritario.
 * Auth: Application Default Credentials en GCP; proyecto y región desde el vault.
 */
export const vertexLlmAdapter: LlmProviderAdapter = {
  id: 'vertex',

  async complete(input: LlmCompletionInput, secrets: OrchestratorLlmSecrets) {
    const project = secrets.vertexProjectId;
    if (!project) {
      throw new Error(
        'vertex: falta FIFER_VERTEX_PROJECT | GOOGLE_CLOUD_PROJECT | GCP_PROJECT en vault',
      );
    }

    const mod = await import('@google-cloud/vertexai').catch(() => null);
    if (!mod?.VertexAI) {
      throw new Error(
        'vertex: instale @google-cloud/vertexai (npm install @google-cloud/vertexai)',
      );
    }

    const { VertexAI } = mod;
    const location = secrets.vertexLocation || 'us-central1';
    const vertexAI = new VertexAI({ project, location });

    const generationConfig: Record<string, unknown> = {
      temperature: input.temperature ?? 0.35,
    };
    if (input.jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const modelOpts: Record<string, unknown> = {
      model: secrets.vertexModelId,
      generationConfig,
    };
    if (input.systemInstruction?.trim()) {
      modelOpts.systemInstruction = {
        role: 'system',
        parts: [{ text: input.systemInstruction.trim() }],
      };
    }

    const model = vertexAI.getGenerativeModel(modelOpts);
    const userText = input.turns.map((t) => `[${t.role}]\n${t.content}`).join('\n\n');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userText }] }],
    });

    const text =
      result.response.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('') ?? '';

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('vertex: respuesta vacía');
    }
    return trimmed;
  },
};
