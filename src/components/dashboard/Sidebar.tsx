'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Building,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Home,
  LineChart,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  {
    icon: Building,
    label: 'Trámites DOM',
    href: '/dashboard/dom',
    children: [
      {
        icon: ClipboardList,
        label: 'Recepción Municipal',
        href: '/dashboard/dom/recepcion',
      },
      {
        icon: FileCheck2,
        label: 'Permisos de Edificación',
        href: '/dashboard/dom/permisos',
      },
      {
        icon: ShieldCheck,
        label: 'Regularizaciones',
        href: '/dashboard/dom/regularizaciones',
      },
      {
        icon: BookOpen,
        label: 'Normativa OGUC/LGUC',
        href: '/dashboard/dom/normativa',
      },
    ],
  },
  { icon: LineChart, label: 'Finanzas y Flujo', href: '/dashboard/finanzas' },
  { icon: Sparkles, label: 'Contenido AI', href: '/dashboard/contenido-ai' },
  { icon: Users, label: 'Red de Afiliados', href: '/dashboard/afiliados' },
  { icon: User, label: 'Perfil Profesional', href: '/dashboard/perfil' },
];

function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== '/' && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function parentLabelToExpandForPath(pathname: string): string | null {
  for (const item of navItems) {
    if (!item.children?.length) continue;
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
const rowActive =
  'border-[#EAB308] bg-[#1E293B] text-[#EAB308]';

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  useLayoutEffect(() => {
    setExpandedLabel(parentLabelToExpandForPath(pathname));
  }, [pathname]);

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
            const hasChildren = Boolean(item.children?.length);
            const expanded = expandedLabel === item.label;

            if (!hasChildren) {
              const active = isActiveHref(pathname, item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`${rowBase} ${active ? rowActive : `${rowInactive} ${rowHover}`}`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            }

            const subtreeActive = item.children!.some((c) =>
              isActiveHref(pathname, c.href),
            );

            return (
              <li key={item.label}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedLabel((prev) =>
                      prev === item.label ? null : item.label,
                    )
                  }
                  className={`${rowBase} ${rowInactive} ${rowHover} ${
                    subtreeActive && !expanded
                      ? 'text-slate-300'
                      : ''
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="min-w-0 flex-1 text-left">{item.label}</span>
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
                      {item.children!.map((child) => {
                        const active = isActiveHref(pathname, child.href);
                        return (
                          <li key={child.label}>
                            <Link
                              href={child.href}
                              className={`${rowBase} ${
                                active ? rowActive : `${rowInactive} ${rowHover}`
                              }`}
                            >
                              <child.icon className="h-5 w-5 flex-shrink-0" />
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#1E293B] px-5 py-4">
        <p className="text-sm font-medium text-[#F9FAFB]">Carlos Mendoza</p>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">Administrador</p>
      </div>
    </aside>
  );
}
