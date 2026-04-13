/** Hasta instalar `@google-cloud/vertexai`; el adaptador usa import dinámico. */
declare module '@google-cloud/vertexai' {
  export class VertexAI {
    constructor(opts: { project: string; location: string });
    getGenerativeModel(opts: Record<string, unknown>): {
      generateContent(req: unknown): Promise<{
        response: {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
      }>;
    };
  }
}
