'use client';

import { useState } from 'react';
import { 
  HiOutlineHome, 
  HiOutlineFolder, 
  HiOutlineDocumentText, 
  HiOutlineChartBar, 
  HiOutlineCog,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClipboardList,
  HiOutlineOfficeBuilding
} from 'react-icons/hi';
import clsx from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: HiOutlineHome, label: 'Dashboard', href: '/dashboard', active: true },
  { icon: HiOutlineFolder, label: 'Expedientes', href: '/dashboard/expedientes' },
  { icon: HiOutlineDocumentText, label: 'Trámites', href: '/dashboard/tramites' },
  { icon: HiOutlineOfficeBuilding, label: 'Proyectos', href: '/dashboard/proyectos' },
  { icon: HiOutlineClipboardList, label: 'Permisos', href: '/dashboard/permisos' },
  { icon: HiOutlineChartBar, label: 'Reportes', href: '/dashboard/reportes' },
];

const bottomNavItems = [
  { icon: HiOutlineCog, label: 'Configuración', href: '/dashboard/config' },
];

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-[#0A0F1E] border-r border-[#1F2937] z-40 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-20' : 'w-[280px]'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'h-16 flex items-center border-b border-[#1F2937] px-4',
        isCollapsed ? 'justify-center' : 'justify-between'
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EAB308] flex items-center justify-center">
              <span className="text-[#0A0F1E] font-bold text-sm">F</span>
            </div>
            <span className="text-[#F9FAFB] font-semibold text-lg">FIFER</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-xl bg-[#EAB308] flex items-center justify-center">
            <span className="text-[#0A0F1E] font-bold text-sm">F</span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  item.active 
                    ? 'bg-[#EAB308]/10 text-[#EAB308]' 
                    : 'text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB]',
                  isCollapsed && 'justify-center'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-3 border-t border-[#1F2937]">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB] transition-all duration-200',
                  isCollapsed && 'justify-center'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className={clsx(
            'mt-4 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#6B7280] hover:bg-[#1F2937] hover:text-[#F9FAFB] transition-all duration-200',
            isCollapsed && 'justify-center'
          )}
        >
          {isCollapsed ? (
            <HiOutlineChevronRight className="w-5 h-5" />
          ) : (
            <>
              <HiOutlineChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
