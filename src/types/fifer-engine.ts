export interface FiferNormalizedOutput<TData = unknown, TMeta = Record<string, unknown>> {
  engineId: string;
  status: "success" | "error";
  data: TData;
  meta?: TMeta;
  errors?: string[];
  timestamp: string;
}

export interface IFiferEngine<
  TInput = unknown,
  TOutput extends FiferNormalizedOutput = FiferNormalizedOutput,
> {
  engineId: string;
  execute<T = TInput, R extends FiferNormalizedOutput = TOutput>(payload: T): Promise<R>;
}
