/**
 * Semillas alineadas a `v0_pack/04_INTEGRATIONS_HEALTH.md` — usadas cuando no hay telemetría en DB.
 */

export type IntegrationHealthRow = {
  service: string;
  status: "active" | "warning" | "inactive" | "ghost";
  failureType: string;
  reason: string;
  action: string;
  lastCheck: string;
};

/** Tabla § Estado de salud por servicio (documento 04). */
export const INTEGRATIONS_HEALTH_SERVICES: readonly IntegrationHealthRow[] = [
  {
    service: "Shopify (ABKupfer)",
    status: "active",
    failureType: "—",
    reason: "N/A",
    action: "Ninguna",
    lastCheck: "2026-04-08",
  },
  {
    service: "MercadoLibre",
    status: "inactive",
    failureType: "Credenciales",
    reason: "Falta Client Secret / API Key",
    action: "Ingresar credenciales en Perfil / vault BYOK",
    lastCheck: "2026-04-08",
  },
  {
    service: "Meta Ads",
    status: "warning",
    failureType: "Token / autorización",
    reason: "Token larga duración vencido o falta re-auth",
    action: "Reconectar OAuth en panel",
    lastCheck: "2026-04-07",
  },
  {
    service: "Google Ads / Shopping",
    status: "inactive",
    failureType: "Credenciales",
    reason: "Falta API Key / OAuth; campañas pausadas en mock",
    action: "Conectar cuenta en integraciones",
    lastCheck: "2026-04-08",
  },
  {
    service: "OpenAI",
    status: "active",
    failureType: "—",
    reason: "BYOK verificado",
    action: "Ninguna",
    lastCheck: "2026-04-08",
  },
  {
    service: "API Municipal Chicureo",
    status: "ghost",
    failureType: "Origen de datos",
    reason: "API no pública; mocks hasta nueva versión",
    action: "Mantener mocks en finance-data",
    lastCheck: "2026-04-05",
  },
  {
    service: "Transbank",
    status: "inactive",
    failureType: "Infra / certificado",
    reason: "Certificado .crt vencido o mal montado",
    action: "Actualizar certs en servidor",
    lastCheck: "2026-04-01",
  },
] as const;

export type MockTelemetryLogLine = {
  id: string;
  at: string;
  level: "info" | "success" | "warn" | "alert";
  message: string;
};

/** Flujo tipo terminal — discovery / ranking / fallos (demo). */
export const MOCK_TELEMETRY_LIVE_LOGS: readonly MockTelemetryLogLine[] = [
  {
    id: "l1",
    at: new Date().toISOString(),
    level: "info",
    message: "Nuevo modelo gpt-5-pro detectado vía OpenRouter — pending review en fifer_ai_meta",
  },
  {
    id: "l2",
    at: new Date(Date.now() - 120000).toISOString(),
    level: "success",
    message: "Runway Gen-3 Alpha — ranking video +0.2 tras éxito en tarea «fachada cinemática»",
  },
  {
    id: "l3",
    at: new Date(Date.now() - 300000).toISOString(),
    level: "warn",
    message: "Claude 3.5 Sonnet — 3× 5xx en ventana 15m; penalización temporal de ranking aplicada",
  },
  {
    id: "l4",
    at: new Date(Date.now() - 600000).toISOString(),
    level: "info",
    message: "Gemini 1.5 Flash — latencia p50 890ms; performance estable (Dual-Stage refine)",
  },
  {
    id: "l5",
    at: new Date(Date.now() - 900000).toISOString(),
    level: "alert",
    message: "Meta Ads token — estado Warning según 04_INTEGRATIONS_HEALTH; sin impacto en motor IA",
  },
  {
    id: "l6",
    at: new Date(Date.now() - 1200000).toISOString(),
    level: "success",
    message: "Leonardo.ai — cost_per_unit sincronizado desde catálogo OpenRouter",
  },
  {
    id: "l7",
    at: new Date(Date.now() - 1500000).toISOString(),
    level: "info",
    message: "CreditOrchestrator — margen base 20% + volatilidad 0.4pp en openai-gpt-4o",
  },
];

/** Serie últimos 30 días — coste API agregado vs créditos (demo, sin hardcode por motor). */
export function buildMockMonthlyCostCurve(): { day: string; apiUsd: number; credits: number }[] {
  const out: { day: string; apiUsd: number; credits: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const seed = (d.getDate() + d.getMonth() * 7) % 17;
    out.push({
      day: d.toISOString().slice(0, 10),
      apiUsd: 120 + seed * 12 + (i % 5) * 8,
      credits: 48000 + seed * 900 + (i % 4) * 400,
    });
  }
  return out;
}

export type MockArenaDefaults = Record<
  string,
  { performancePct: number; qualityPct: number }
>;

/** Valores demo por `engineId` cuando no hay muestras de telemetría. */
export function mockArenaDefaultsForEngine(engineId: string): { performancePct: number; qualityPct: number } {
  let h = 0;
  for (let i = 0; i < engineId.length; i++) h = (h * 33 + engineId.charCodeAt(i)) >>> 0;
  const performancePct = 42 + (h % 48);
  const qualityPct = 55 + ((h >> 8) % 40);
  return { performancePct, qualityPct };
}
