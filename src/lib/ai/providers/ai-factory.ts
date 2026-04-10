import { ElevenLabsProvider } from "./elevenlabs.provider";
import { LeonardoProvider } from "./leonardo.provider";
import { OpenAiProvider } from "./openai.provider";
import { AIVault } from "../../security/ai-vault";
import {
  adaptAiProviderError,
  adaptAiProviderResponse,
  type UniversalAiEnvelope,
} from "./universal-adapter";

export type AiTaskType = "text" | "image" | "audio";

type TextPayload = {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
};

type ImagePayload = Record<string, unknown>;
type AudioPayload = Record<string, unknown>;

export class AiFactory {
  static async runTextTask(
    payload: TextPayload,
    userId?: string,
    apiKey?: string
  ): Promise<UniversalAiEnvelope<unknown>> {
    try {
      const resolvedKey = apiKey ?? (await AIVault.resolveKey("openai", userId));
      const provider = new OpenAiProvider();
      return await provider.generateText(payload, resolvedKey, userId);
    } catch (err) {
      return adaptAiProviderError("openai", "text", err);
    }
  }

  static async runImageTask(
    payload: ImagePayload,
    userId?: string,
    apiKey?: string
  ): Promise<UniversalAiEnvelope<unknown>> {
    try {
      const resolvedKey = apiKey ?? (await AIVault.resolveKey("leonardo", userId));
      const provider = new LeonardoProvider();
      return await provider.generateImage(payload, resolvedKey, userId);
    } catch (err) {
      return adaptAiProviderError("leonardo", "image", err);
    }
  }

  static async runAudioTask(
    payload: AudioPayload,
    userId?: string,
    apiKey?: string
  ): Promise<UniversalAiEnvelope<unknown>> {
    try {
      const resolvedKey = apiKey ?? (await AIVault.resolveKey("elevenlabs", userId));
      const provider = new ElevenLabsProvider();
      const data = await provider.execute({ action: "text-to-speech", payload }, resolvedKey);
      return adaptAiProviderResponse("elevenlabs", "audio", data);
    } catch (err) {
      return adaptAiProviderError("elevenlabs", "audio", err);
    }
  }

  static resolveProvider(taskType: AiTaskType): "openai" | "leonardo" | "elevenlabs" {
    if (taskType === "text") return "openai";
    if (taskType === "image") return "leonardo";
    return "elevenlabs";
  }
}
