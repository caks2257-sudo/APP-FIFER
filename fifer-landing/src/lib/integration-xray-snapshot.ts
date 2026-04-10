/**
 * Espejo **estructurado** de `_xray_INTEGRATIONS.md` (tabla «Estado de salud por servicio»).
 * `useFiferAlerts` usa `status === "inactive"` (🔴) para alertas de autosanación.
 *
 * **Mantener alineado** con el Markdown al cambiar Status / servicios (§0.2).
 */
export type IntegrationXRayStatus = "healthy" | "warning" | "inactive" | "ghost";

export interface IntegrationXRayEntry {
  id: string;
  label: string;
  status: IntegrationXRayStatus;
  failureType: string | null;
  inactiveReason: string;
  requiredAction: string;
  lastCheck: string;
}

/** Valores derivados de `_xray_INTEGRATIONS.md` (2026-04-08). */
export const INTEGRATION_XRAY_SNAPSHOT: readonly IntegrationXRayEntry[] = [
  {
    id: "shopify-abkupfer",
    label: "Shopify (tienda ABKupfer)",
    status: "healthy",
    failureType: null,
    inactiveReason: "N/A",
    requiredAction: "Ninguna",
    lastCheck: "2026-04-08",
  },
  {
    id: "mercadolibre",
    label: "MercadoLibre",
    status: "inactive",
    failureType: "Credenciales",
    inactiveReason: "Falta Client Secret / API Key en perfil o vault BYOK",
    requiredAction: "Ingresar credenciales en Perfil / fifer_auth.user_api_keys",
    lastCheck: "2026-04-08",
  },
  {
    id: "meta-ads",
    label: "Meta Ads (Instagram / Facebook)",
    status: "warning",
    failureType: "Token / autorización",
    inactiveReason: "Token de larga duración vencido o falta re-auth OAuth",
    requiredAction: "Usuario autoriza de nuevo en el panel (Business / Marketing API)",
    lastCheck: "2026-04-07",
  },
  {
    id: "google-ads-shopping",
    label: "Google Ads / Shopping",
    status: "inactive",
    failureType: "Credenciales",
    inactiveReason: "Falta API Key / OAuth de Google Ads; campañas pausadas en mock",
    requiredAction: "Inyectar llave o conectar cuenta en integraciones",
    lastCheck: "2026-04-08",
  },
  {
    id: "openai",
    label: "OpenAI (modelos IA)",
    status: "healthy",
    failureType: null,
    inactiveReason: "N/A",
    requiredAction: "BYOK verificado",
    lastCheck: "2026-04-08",
  },
  {
    id: "api-municipal-chicureo",
    label: "API Municipal (Chicureo)",
    status: "ghost",
    failureType: "Origen de datos",
    inactiveReason: "API no pública; scraper o mocks hasta nueva versión",
    requiredAction: "Mantener mocks en fifer-landing/src/mocks/finance-data.ts",
    lastCheck: "2026-04-05",
  },
  {
    id: "transbank",
    label: "Transbank",
    status: "inactive",
    failureType: "Infra / certificado",
    inactiveReason: "Certificado .crt vencido o mal montado en servidor",
    requiredAction: "Actualizar certificados en el server y variables de entorno",
    lastCheck: "2026-04-01",
  },
] as const;

export function getInactiveIntegrations(): IntegrationXRayEntry[] {
  return INTEGRATION_XRAY_SNAPSHOT.filter((e) => e.status === "inactive");
}
