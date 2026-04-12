/**
 * Registro maestro de Apps FIFER (Cap. 6 — Manifest obligatorio).
 * La Sidebar resuelve enlaces de aplicación solo desde aquí.
 */

export type FiferAppAccessTier =
  | 'public'
  | 'free'
  | 'pro'
  | 'admin'
  | 'user-custom';

export interface FiferAppDefinition {
  /** Identificador estable (slug lógico). */
  id: string;
  label: string;
  href: string;
  /** Nombre del icono Lucide (resuelto en Sidebar). */
  iconKey: SidebarIconKey;
  permission: FiferAppAccessTier;
  /** Agrupación visual en la Sidebar. */
  category: string;
}

export type SidebarIconKey =
  | 'Home'
  | 'Building'
  | 'ClipboardList'
  | 'FileCheck2'
  | 'ShieldCheck'
  | 'BookOpen'
  | 'Landmark'
  | 'LineChart'
  | 'FileText'
  | 'Sparkles'
  | 'LayoutGrid'
  | 'Box'
  | 'Bot'
  | 'MessageSquare'
  | 'User'
  | 'Code2'
  | 'Terminal';

export interface SidebarNavLeaf {
  type: 'link';
  label: string;
  href: string;
  iconKey: SidebarIconKey;
  /** Si existe, toma href/label/iconKey/permission del `appRegistry`. */
  appId?: FiferAppDefinition['id'];
  permission?: FiferAppAccessTier;
}

export interface SidebarNavGroup {
  type: 'group';
  label: string;
  href: string;
  iconKey: SidebarIconKey;
  children: SidebarNavLeaf[];
  permission?: FiferAppAccessTier;
}

export type SidebarNavNode = SidebarNavLeaf | SidebarNavGroup;

/** Apps inscritas (manifest). Toda app visible debe existir aquí. */
export const appRegistry: FiferAppDefinition[] = [
  {
    id: 'contratos',
    label: 'Control de Contratos',
    href: '/contratos',
    iconKey: 'FileText',
    permission: 'pro',
    category: 'finanzas',
  },
  {
    id: 'inmobiliario',
    label: 'Dashboard Inmobiliario',
    href: '/dashboardinmobiliario',
    iconKey: 'Building',
    permission: 'free',
    category: 'inmobiliario',
  },
  {
    id: 'misbots',
    label: 'Cockpit Mis Bots',
    href: '/misbots',
    iconKey: 'Bot',
    permission: 'free',
    category: 'automation',
  },
  {
    id: 'desarrollador',
    label: 'App Desarrollador',
    href: '/desarrollador',
    iconKey: 'Code2',
    permission: 'admin',
    category: 'master',
  },
  {
    id: 'ia-orchestrator',
    label: 'AODS — Orquestador IA',
    href: '/ia-orchestrator',
    iconKey: 'Sparkles',
    permission: 'admin',
    category: 'master',
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    href: '/finanzas',
    iconKey: 'LineChart',
    permission: 'pro',
    category: 'finanzas',
  },
];

const appById = Object.fromEntries(
  appRegistry.map((a) => [a.id, a]),
) as Record<string, FiferAppDefinition>;

function resolveLeaf(leaf: SidebarNavLeaf): SidebarNavLeaf {
  if (!leaf.appId) return leaf;
  const app = appById[leaf.appId];
  if (!app) return leaf;
  return {
    ...leaf,
    label: app.label,
    href: app.href,
    iconKey: app.iconKey,
    permission: app.permission,
  };
}

function resolveGroup(group: SidebarNavGroup): SidebarNavGroup {
  return {
    ...group,
    children: group.children.map(resolveLeaf),
  };
}

/** Árbol de navegación (plataforma + apps resueltas desde `appRegistry`). */
const sidebarNavigationSource = [
  {
    type: 'link',
    label: 'Dashboard',
    href: '/dashboard',
    iconKey: 'Home',
    permission: 'public',
  },
  {
    type: 'group',
    label: 'Trámites DOM',
    href: '/dom',
    iconKey: 'Building',
    permission: 'public',
    children: [
      {
        type: 'link',
        label: 'Recepción Municipal',
        href: '/dom/recepcion',
        iconKey: 'ClipboardList',
        permission: 'public',
      },
      {
        type: 'link',
        label: 'Permisos de Edificación',
        href: '/dom/permisos',
        iconKey: 'FileCheck2',
        permission: 'public',
      },
      {
        type: 'link',
        label: 'Regularizaciones',
        href: '/dom/regularizaciones',
        iconKey: 'ShieldCheck',
        permission: 'public',
      },
      {
        type: 'link',
        label: 'Normativa OGUC/LGUC',
        href: '/dom/normativa',
        iconKey: 'BookOpen',
        permission: 'public',
      },
    ],
  },
  {
    type: 'group',
    label: 'Gestión Real Estate',
    href: '/dashboardinmobiliario',
    iconKey: 'Landmark',
    permission: 'public',
    children: [
      {
        type: 'link',
        label: 'Dashboard Inmobiliario',
        href: '/dashboardinmobiliario',
        iconKey: 'Building',
        appId: 'inmobiliario',
      },
    ],
  },
  {
    type: 'group',
    label: 'Finanzas',
    href: '/finanzas',
    iconKey: 'LineChart',
    permission: 'public',
    children: [
      {
        type: 'link',
        label: 'Finanzas',
        href: '/finanzas',
        iconKey: 'LineChart',
        appId: 'finanzas',
      },
      {
        type: 'link',
        label: 'Control de Contratos',
        href: '/contratos',
        iconKey: 'FileText',
        appId: 'contratos',
      },
    ],
  },
  {
    type: 'link',
    label: 'Contenido AI',
    href: '/dashboard/contenido-ai',
    iconKey: 'Sparkles',
    permission: 'public',
  },
  {
    type: 'group',
    label: 'Mis Apps',
    href: '/dashboard/mis-apps',
    iconKey: 'LayoutGrid',
    permission: 'public',
    children: [
      {
        type: 'link',
        label: 'App AB Kupfer',
        href: '/dashboard/mis-apps/ab-kupfer',
        iconKey: 'Box',
        permission: 'user-custom',
      },
    ],
  },
  {
    type: 'group',
    label: 'Mis Bots',
    href: '/misbots',
    iconKey: 'Bot',
    permission: 'public',
    children: [
      {
        type: 'link',
        label: 'Cockpit Mis Bots',
        href: '/misbots',
        iconKey: 'Bot',
        appId: 'misbots',
      },
      {
        type: 'link',
        label: 'Configuración de bots',
        href: '/misbots/config',
        iconKey: 'Bot',
        permission: 'public',
      },
      {
        type: 'link',
        label: 'Asistente DOM',
        href: '/dashboard/mis-bots/asistente-dom',
        iconKey: 'MessageSquare',
        permission: 'public',
      },
    ],
  },
  {
    type: 'link',
    label: 'Perfil Profesional',
    href: '/dashboard/perfil',
    iconKey: 'User',
    permission: 'public',
  },
  {
    type: 'group',
    label: 'SISTEMA',
    href: '/desarrollador',
    iconKey: 'Terminal',
    permission: 'public',
    children: [
      {
        type: 'link',
        label: 'App Desarrollador',
        href: '/desarrollador',
        iconKey: 'Code2',
        appId: 'desarrollador',
      },
      {
        type: 'link',
        label: 'AODS Orquestador',
        href: '/ia-orchestrator',
        iconKey: 'Sparkles',
        appId: 'ia-orchestrator',
      },
      {
        type: 'link',
        label: 'Conexiones externas',
        href: '/desarrollador/conexiones-externas',
        iconKey: 'Terminal',
        permission: 'admin',
      },
    ],
  },
] as const satisfies ReadonlyArray<SidebarNavNode>;

export const sidebarNavigation: SidebarNavNode[] = sidebarNavigationSource.map(
  (node): SidebarNavNode =>
    node.type === 'group' ? resolveGroup(node) : resolveLeaf(node),
);

export function isAppEntryVisible(
  permission: FiferAppAccessTier | undefined,
  profile: { tier?: 'free' | 'pro'; role?: string },
): boolean {
  const p = permission ?? 'public';
  if (p === 'admin') {
    const isAdmin =
      profile.role?.toLowerCase() === 'admin' || profile.role === 'Administrador';
    return isAdmin;
  }
  if (p === 'pro') return profile.tier === 'pro';
  if (p === 'user-custom') return true;
  return true;
}

export function filterSidebarNavigation(
  nodes: SidebarNavNode[],
  profile: { tier?: 'free' | 'pro'; role?: string },
): SidebarNavNode[] {
  const out: SidebarNavNode[] = [];
  for (const node of nodes) {
    if (node.type === 'link') {
      if (!isAppEntryVisible(node.permission, profile)) continue;
      out.push(node);
      continue;
    }
    const children = node.children.filter((c) =>
      isAppEntryVisible(c.permission, profile),
    );
    if (children.length === 0) continue;
    out.push({ ...node, children });
  }
  return out;
}
