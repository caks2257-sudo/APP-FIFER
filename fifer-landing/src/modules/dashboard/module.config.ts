import type { ModuleConfig } from "@/types/architecture";

export const DashboardModuleConfig: ModuleConfig = {
  id: "dashboard",
  nombre: "Dashboard",
  icono: "layout-dashboard",
  routes: [
    {
      path: "/",
      slots: {
        "slot-hero": ["fifer-vision-slot", "global-kpi-summary", "system-ia-insights"],
      },
    },
    /** Placeholder Vault / credenciales — CTA desde Discovery (401/403). */
    {
      path: "/vault",
      slots: {},
    },
  ],
};
