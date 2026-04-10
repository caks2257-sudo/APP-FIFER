/**
 * Estructura de sidebar (datos estáticos). Rutas alineadas con el App Router.
 */
export type SidebarNavItem = {
  id: string;
  label: string;
  href: string;
  /** Nombre de icono opcional (p. ej. lucide). */
  icon?: string;
};

export type SidebarNavSection = {
  id: string;
  label: string;
  items: SidebarNavItem[];
};

export const sidebarNavigation = {
  sections: [
    {
      id: "main",
      label: "Principal",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/dashboard",
          icon: "LayoutDashboard",
        },
        {
          id: "expedientes",
          label: "Expedientes",
          href: "/expedientes",
          icon: "FolderOpen",
        },
        {
          id: "configuraciones",
          label: "Configuraciones",
          href: "/configuraciones",
          icon: "Settings",
        },
      ],
    },
  ],
} as const satisfies { sections: readonly SidebarNavSection[] };
