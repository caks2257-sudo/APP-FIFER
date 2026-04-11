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
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  filterSidebarNavigation,
  type SidebarNavGroup,
  type SidebarNavLeaf,
  type SidebarNavNode,
  sidebarNavigation,
} from '@/registry/app-registry';
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
}: {
  leaf: SidebarNavLeaf;
  pathname: string;
}) {
  const Icon = iconMap[leaf.iconKey] ?? LayoutGrid;
  const active = isActiveHref(pathname, leaf.href);
  return (
    <Link
      href={leaf.href}
      className={`${rowBase} ${active ? rowActive : `${rowInactive} ${rowHover}`}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span>{leaf.label}</span>
    </Link>
  );
}

function NavGroupRow({
  group,
  pathname,
  expanded,
  onToggle,
}: {
  group: SidebarNavGroup;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = iconMap[group.iconKey] ?? LayoutGrid;
  const subtreeActive = group.children.some((c) => isActiveHref(pathname, c.href));

  return (
    <li key={group.label}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className={`${rowBase} ${rowInactive} ${rowHover} ${
          subtreeActive && !expanded ? 'text-slate-300' : ''
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="min-w-0 flex-1 text-left">{group.label}</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
        )}
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-1 pl-10 pt-1">
            {group.children.map((child) => (
              <li key={`${group.label}-${child.label}`}>
                <NavLinkRow leaf={child} pathname={pathname} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

function footerRoleLabel(role: string | undefined): string {
  if (!role) return 'Usuario';
  if (role.toLowerCase() === 'admin' || role === 'Administrador') return 'Administrador';
  return role;
}

export default function Sidebar() {
  const pathname = usePathname();
  const coreProfile = useUserDnaStore((s) => s.coreProfile);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  const displayName =
    coreProfile.name?.trim() ||
    `${coreProfile.nombres} ${coreProfile.apellidoPaterno}`.trim();

  const navItems = useMemo(
    () => filterSidebarNavigation(sidebarNavigation, coreProfile),
    [coreProfile],
  );

  useLayoutEffect(() => {
    setExpandedLabel(parentLabelToExpandForPath(pathname, navItems));
  }, [pathname, navItems]);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[#1E293B] bg-[#0A0F1E]">
      <div className="h-20 border-b border-[#1E293B] px-5">
        <div className="flex h-full items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E293B]">
            <span className="text-sm font-semibold text-[#EAB308]">F</span>
          </div>
          <span className="text-base font-semibold tracking-wide text-[#F9FAFB]">FIFER</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
          Modulos FIFER
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            if (item.type === 'link') {
              return (
                <li key={item.label}>
                  <NavLinkRow leaf={item} pathname={pathname} />
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
          {footerRoleLabel(coreProfile.role)}
        </p>
      </div>
    </aside>
  );
}
