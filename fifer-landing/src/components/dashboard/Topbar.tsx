'use client';

import { HiOutlineSearch, HiOutlineBell } from 'react-icons/hi';
import clsx from 'clsx';

interface TopbarProps {
  isSidebarCollapsed: boolean;
}

export default function Topbar({ isSidebarCollapsed }: TopbarProps) {
  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-16 bg-[#0A0F1E]/95 backdrop-blur-sm border-b border-[#1F2937] z-50 flex items-center justify-between px-6 transition-all duration-300',
        isSidebarCollapsed ? 'left-20' : 'left-[280px]'
      )}
    >
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Buscar expedientes, trámites, proyectos..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-[#1F2937] rounded-xl text-sm text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:border-[#EAB308]/50 focus:ring-1 focus:ring-[#EAB308]/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-[#1F2937] rounded text-xs text-[#6B7280]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB] transition-all">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EAB308] rounded-full" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#1F2937]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[#F9FAFB]">Carlos Mendoza</p>
            <p className="text-xs text-[#6B7280]">Administrador</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EAB308] to-[#F59E0B] flex items-center justify-center">
            <span className="text-[#0A0F1E] font-semibold text-sm">CM</span>
          </div>
        </div>
      </div>
    </header>
  );
}
