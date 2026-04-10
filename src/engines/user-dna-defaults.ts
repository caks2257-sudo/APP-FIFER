/**
 * Tokens estáticos del User DNA de referencia (`src/modules/user/_xray_USER_DNA.md`).
 * Dual-Stage AI (Refinement → Execution) los inyecta en el Master Prompt sin exponer PII en cliente.
 */
export const FIFER_DEFAULT_USER_DNA = {
  identityName: "Cristobal Kupfer",
  roles: ["Arquitecto", "Real Estate"] as const,
  territory: "Chicureo",
  pillars: ["FIFER", "ABKupfer"] as const,
  locale: "es-CL",
} as const;
