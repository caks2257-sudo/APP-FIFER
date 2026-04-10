/** Errores típicos de red / Supabase / fetch — activan Ghost Mode en lugar de alerta roja. */
export function isIntegrationFailure(error: Error): boolean {
  const extra =
    typeof (error as Error & { cause?: unknown }).cause === "object" &&
    (error as Error & { cause?: { message?: string } }).cause?.message
      ? String((error as Error & { cause?: { message?: string } }).cause?.message)
      : "";
  const m = `${error.message}\n${extra}\n${(error as Error & { digest?: string }).digest ?? ""}`.toLowerCase();
  const hints = [
    "supabase",
    "fetch",
    "network",
    "failed to fetch",
    "load failed",
    "connection",
    "econnrefused",
    "etimedout",
    "timeout",
    "aborted",
    "networkerror",
    "edge function",
    "rest error",
  ];
  return hints.some((h) => m.includes(h));
}
