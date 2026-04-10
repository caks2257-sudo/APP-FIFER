import { z } from "zod";

/** Riesgo operativo del motor (auditoría / Vault). */
export const UserEngineRiskSchema = z.enum(["low", "medium", "high"]);

const IoFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  type: z.string().optional(),
});

/**
 * Esquema estricto para `engine_report.json` bajo `user_space/.../engines/<slug>/`.
 */
export const EngineReportSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  function: z.string().min(1),
  risk: UserEngineRiskSchema,
  inputs: z.array(IoFieldSchema),
  outputs: z.array(IoFieldSchema),
  version: z.string().min(1),
});

export type UserEngineReport = z.infer<typeof EngineReportSchema>;
export type UserEngineRisk = z.infer<typeof UserEngineRiskSchema>;

export function parseEngineReportJson(data: unknown): UserEngineReport {
  return EngineReportSchema.parse(data);
}

export function safeParseEngineReportJson(data: unknown) {
  return EngineReportSchema.safeParse(data);
}

/** Plantilla mínima cuando el scaffold no envía un reporte completo. */
export function defaultEngineReportForSlug(slug: string): UserEngineReport {
  return {
    id: slug,
    name: slug,
    function: "execute",
    risk: "medium",
    inputs: [{ id: "input", label: "Entrada principal", type: "string" }],
    outputs: [{ id: "output", label: "Salida del motor", type: "unknown" }],
    version: "0.1.0-draft",
  };
}
