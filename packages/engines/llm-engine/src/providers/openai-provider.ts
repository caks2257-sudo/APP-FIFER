import { ProviderStrategy, AIProviderName, LLMConfig, PromptContext } from '../types';

export class OpenAIProvider implements ProviderStrategy {
  name: AIProviderName = 'OPENAI';

  async generateText(config: LLMConfig, context: PromptContext): Promise<string> {
    if (!config.apiKey) throw new Error('API Key requerida para OpenAI (BYOK).');

    // Simulación de llamada a LLM
    console.log(`[OpenAI] Ejecutando modelo ${config.model}...`);

    // Lógica mock para diferenciar refinamiento de ejecución final basada en las instrucciones
    if (context.systemInstructions.includes('Eres un pulidor de prompts')) {
      return `[Prompt Refinado]: ${context.userPrompt} con contexto enriquecido.`;
    }

    return `[Respuesta Final Pro]: Contenido generado con calidad de estudio basado en: ${context.userPrompt}`;
  }
}
