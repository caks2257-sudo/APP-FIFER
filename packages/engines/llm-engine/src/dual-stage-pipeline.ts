import { LLMConfig, PromptContext, ProviderStrategy, DualStageResult, AIProviderName } from './types';

export class DualStagePipeline {
  private providers: Map<AIProviderName, ProviderStrategy> = new Map();

  registerProvider(provider: ProviderStrategy) {
    this.providers.set(provider.name, provider);
  }

  private getProvider(name: AIProviderName): ProviderStrategy {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Proveedor ${name} no registrado en el motor.`);
    return provider;
  }

  async execute(
    userPrompt: string,
    refinerConfig: LLMConfig, // Motor base para pulir
    executorConfig?: LLMConfig // Motor Pro para ejecutar (Opcional, undefined si es usuario FREE)
  ): Promise<DualStageResult> {
    // ETAPA 1: REFINAMIENTO (isRefining = true en UI)
    const refiner = this.getProvider(refinerConfig.provider);
    const refineContext: PromptContext = {
      systemInstructions: 'Eres un pulidor de prompts de arquitectura y marketing. Mejora este prompt.',
      userPrompt: userPrompt,
    };

    const refinedPrompt = await refiner.generateText(refinerConfig, refineContext);

    // Si no hay configuración de ejecutor (ej. usuario FREE sin Pro), nos detenemos aquí.
    if (!executorConfig) {
      return { refinedPrompt, status: 'REFINED_ONLY' };
    }

    // ETAPA 2: EJECUCIÓN PRO
    const executor = this.getProvider(executorConfig.provider);
    const executionContext: PromptContext = {
      systemInstructions: 'Eres un experto creador de contenido y arquitecto. Ejecuta la tarea solicitada.',
      userPrompt: refinedPrompt, // Usamos el prompt pulido
    };

    const finalOutput = await executor.generateText(executorConfig, executionContext);

    return {
      refinedPrompt,
      finalOutput,
      status: 'COMPLETED',
    };
  }
}
