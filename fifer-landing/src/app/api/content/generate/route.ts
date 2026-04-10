import { NextResponse } from "next/server";
import { DualStagePipeline, OpenAIProvider, LLMConfig } from "@fifer/llm-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productTitle, productDescription, isProUser = true } = body;

    const pipeline = new DualStagePipeline();
    pipeline.registerProvider(new OpenAIProvider());

    const basePrompt = `Crea un post para redes sociales sobre este producto: ${productTitle}. Características: ${productDescription}.`;

    const refinerConfig: LLMConfig = { provider: "OPENAI", apiKey: "mock-key", model: "gpt-4o-mini" };

    const executorConfig: LLMConfig | undefined = isProUser
      ? { provider: "OPENAI", apiKey: "mock-key", model: "gpt-4o" }
      : undefined;

    const result = await pipeline.execute(basePrompt, refinerConfig, executorConfig);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: "Error en generación", details: msg }, { status: 500 });
  }
}
