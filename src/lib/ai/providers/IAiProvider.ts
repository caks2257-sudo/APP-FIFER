export interface IAiProvider {
  execute(payload: any, apiKey: string): Promise<unknown>;
}
