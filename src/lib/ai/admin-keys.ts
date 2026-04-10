/**
 * Solo administrador FIFER: `FIFER_ADMIN_*` en el motor.
 * BYOK de usuario no está implementado aquí — ver `AIOrchestrator` (501 si `useAdminKey: false`).
 * No exponer valores al cliente; la ruta HTTP exige auth (p. ej. JWT Supabase en master).
 */

function trimEnv(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export type AdminProviderKey = "openai" | "gemini" | "elevenlabs" | "leonardo";

export function resolveAdminApiKey(provider: string): string | undefined {
  const p = String(provider || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
  switch (p) {
    case "openai":
      return trimEnv("FIFER_ADMIN_OPENAI_KEY");
    case "gemini":
      return trimEnv("FIFER_ADMIN_GEMINI_KEY");
    case "elevenlabs":
      return trimEnv("FIFER_ADMIN_ELEVENLABS_KEY");
    case "leonardo":
      return trimEnv("FIFER_ADMIN_LEONARDO_KEY");
    default:
      return undefined;
  }
}
