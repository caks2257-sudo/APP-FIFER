'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  Box,
  Building,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Code2,
  FileCheck2,
  FileText,
  Home,
  Landmark,
  LayoutGrid,
  LineChart,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLayoutEffect, useMemo, useState } from 'react';
import FiferIsotypeMark from '@/components/branding/FiferIsotypeMark';
import {
  buildSidebarNavigationForContext,
  filterSidebarNavigation,
  type SidebarNavGroup,
  type SidebarNavLeaf,
  type SidebarNavNode,
} from '@/registry/app-registry';
import {
  isSidebarLeafProvisioning,
  misAppSlugFromHref,
  useUIStore,
} from '@/store/ui-store';
import { useUserDnaStore } from '@/store/useUserDnaStore';

const iconMap: Record<string, LucideIcon> = {
  Home,
  Building,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  BookOpen,
  Landmark,
  LineChart,
  FileText,
  Sparkles,
  Users,
  LayoutGrid,
  Box,
  Bot,
  MessageSquare,
  User,
  Code2,
  Terminal,
};

function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== '/' && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function parentLabelToExpandForPath(
  pathname: string,
  nodes: SidebarNavNode[],
): string | null {
  for (const item of nodes) {
    if (item.type !== 'group') continue;
    const childHit = item.children.some((c) => isActiveHref(pathname, c.href));
    if (childHit) return item.label;
    if (isActiveHref(pathname, item.href)) return item.label;
  }
  return null;
}

const rowBase =
  'flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-200';
const rowInactive = 'border-transparent bg-transparent text-slate-400';
const rowHover = 'hover:bg-white/5 hover:text-[#F9FAFB]';
const rowActive = 'border-[#EAB308] bg-[#1E293B] text-[#EAB308]';

function NavLinkRow({
  leaf,
  pathname,
  showProvisioningSpinner,
}: {
  leaf: SidebarNavLeaf;
  pathname: string;
  showProvisioningSpinner?: boolean;
}) {
  const Icon = iconMap[leaf.iconKey] ?? LayoutGrid;
  const active = isActiveHref(pathname, leaf.href);
  return (
    <Link
      href={leaf.href}
      className={`${rowBase} w-full ${active ? rowActive : `${rowInactive} ${rowHover}`}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="min-w-0 flex-1 text-left">{leaf.label}</span>
      {showProvisioningSpinner ? (
        <Loader2
          className="ml-auto h-4 w-4 shrink-0 animate-spin text-[#EAB308]"
          aria-label="Provisionando app"
        />
      ) : null}
    </Link>
  );
}

function MisAppsSubAppRow({
  child,
  pathname,
  appSlug,
}: {
  child: SidebarNavLeaf;
  pathname: string;
  appSlug: string;
}) {
  const router = useRouter();
  const deletingApps = useUIStore((s) => s.deletingApps);
  const setDeletingApp = useUIStore((s) => s.setDeletingApp);
  const setMisAppHidden = useUIStore((s) => s.setMisAppHidden);
  const provisioningApps = useUIStore((s) => s.provisioningApps);
  const abkupferProvisioning = useUIStore((s) => s.provisioningApps['Abkupfer'] === true);
  const deleting = deletingApps[appSlug] === true;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta sub-app del entorno de pruebas?')) return;
    setDeletingApp(appSlug, true);
    try {
      const res = await fetch('/api/v1/factory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ appId: appSlug }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(
          typeof data.error === 'string' ? data.error : `Error al eliminar (${res.status})`,
        );
        return;
      }
      setMisAppHidden(appSlug, true);
      router.refresh();
    } catch {
      window.alert('Error de red al eliminar la sub-app.');
    } finally {
      setDeletingApp(appSlug, false);
    }
  };

  return (
    <li className={`group/row ${deleting ? 'opacity-50' : ''}`}>
      <div className="flex items-stretch gap-0.5 pr-0.5">
        <div className="min-w-0 flex-1">
          <NavLinkRow
            leaf={child}
            pathname={pathname}
            showProvisioningSpinner={
              (appSlug === 'ab-kupfer' && abkupferProvisioning) ||
              isSidebarLeafProvisioning(provisioningApps, child.label)
            }
          />
        </div>
        <button
          type="button"
          aria-label={`Eliminar ${child.label}`}
          disabled={deleting}
          onClick={(e) => void handleDelete(e)}
          className="mt-0.5 flex h-9 w-8 shrink-0 items-center justify-center self-start rounded-md text-red-500/50 opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover/row:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-red-500/40 disabled:pointer-events-none disabled:opacity-30"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#EAB308]" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </li>
  );
}

function NavGroupRow({
  group,
  pathname,
  expanded,
  onToggle,
  provisioningApps,
  hiddenMisAppSlugs,
}: {
  group: SidebarNavGroup;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  provisioningApps: Record<string, boolean>;
  hiddenMisAppSlugs: Record<string, boolean>;
}) {
  const tSidebar = useTranslations('sidebar');
  const Icon = iconMap[group.iconKey] ?? LayoutGrid;
  const visibleChildren =
    group.label === 'Mis Apps'
      ? group.children.filter((c) => {
          const slug = misAppSlugFromHref(c.href);
          if (!slug) return true;
          return hiddenMisAppSlugs[slug] !== true;
        })
      : group.children;
  const subtreeActive = visibleChildren.some((c) => isActiveHref(pathname, c.href));
  const hubActive = isActiveHref(pathname, group.href) || subtreeActive;

  return (
    <li key={group.label}>
      <div
        className={`flex w-full items-stretch gap-0 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          hubActive ? rowActive : `${rowInactive} ${rowHover}`
        }`}
      >
        <Link
          href={group.href}
          className="flex min-w-0 flex-1 items-center gap-3 text-inherit no-underline"
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="min-w-0 flex-1 text-left">{group.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? tSidebar('hideSubmenu') : tSidebar('showSubmenu')}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E]"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
      <div
        className={`grid transition-all duration-200 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-1 pl-10 pt-1">
            {visibleChildren.map((child) => {
              const misSlug =
                group.label === 'Mis Apps' ? misAppSlugFromHref(child.href) : null;
              if (misSlug) {
                return (
                  <MisAppsSubAppRow
                    key={`${group.label}-${child.label}`}
                    child={child}
                    pathname={pathname}
                    appSlug={misSlug}
                  />
                );
              }
              return (
                <li key={`${group.label}-${child.label}`}>
                  <NavLinkRow
                    leaf={child}
                    pathname={pathname}
                    showProvisioningSpinner={isSidebarLeafProvisioning(
                      provisioningApps,
                      child.label,
                    )}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

function footerRoleLabel(
  role: string | undefined,
  t: (key: 'userFallback' | 'roleAdmin') => string,
): string {
  if (!role) return t('userFallback');
  if (role.toLowerCase() === 'admin' || role === 'Administrador') return t('roleAdmin');
  return role;
}

export default function Sidebar() {
  const tSidebar = useTranslations('sidebar');
  const pathname = usePathname();
  const coreProfile = useUserDnaStore((s) => s.coreProfile);
  const provisioningApps = useUIStore((s) => s.provisioningApps);
  const hiddenMisAppSlugs = useUIStore((s) => s.hiddenMisAppSlugs);
  const misAppModules = useUIStore((s) => s.misAppModules);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  const displayName =
    coreProfile.name?.trim() ||
    `${coreProfile.nombres} ${coreProfile.apellidoPaterno}`.trim();

  const currentMisAppSlug = useMemo(() => misAppSlugFromHref(pathname), [pathname]);

  const navBlueprint = useMemo(
    () =>
      buildSidebarNavigationForContext({
        misAppModuleIds: currentMisAppSlug ? misAppModules[currentMisAppSlug] : undefined,
      }),
    [currentMisAppSlug, misAppModules],
  );

  const navItems = useMemo(
    () => filterSidebarNavigation(navBlueprint, coreProfile),
    [coreProfile, navBlueprint],
  );

  useLayoutEffect(() => {
    setExpandedLabel(parentLabelToExpandForPath(pathname, navItems));
  }, [pathname, navItems]);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[#1E293B] bg-[#0A0F1E]">
      <div className="h-20 border-b border-[#1E293B] px-5">
        <div className="flex h-full items-center gap-3">
          <FiferIsotypeMark />
          <span className="text-base font-semibold tracking-wide text-[#F9FAFB]">FIFER</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
          {tSidebar('modulesTitle')}
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            if (item.type === 'link') {
              return (
                <li key={item.label}>
                  <NavLinkRow
                    leaf={item}
                    pathname={pathname}
                    showProvisioningSpinner={isSidebarLeafProvisioning(
                      provisioningApps,
                      item.label,
                    )}
                  />
                </li>
              );
            }

            const expanded = expandedLabel === item.label;
            return (
              <NavGroupRow
                key={item.label}
                group={item}
                pathname={pathname}
                expanded={expanded}
                provisioningApps={provisioningApps}
                hiddenMisAppSlugs={hiddenMisAppSlugs}
                onToggle={() =>
                  setExpandedLabel((prev) => (prev === item.label ? null : item.label))
                }
              />
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#1E293B] px-5 py-4">
        <p className="text-sm font-medium text-[#F9FAFB]">{displayName}</p>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">
          {footerRoleLabel(coreProfile.role, tSidebar)}
        </p>
      </div>
    </aside>
  );
}
