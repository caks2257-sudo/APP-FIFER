import { Bell, Search } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="fixed left-64 right-0 top-0 z-50 flex h-20 items-center justify-between border-b border-[#1E293B] bg-[#0A0F1E]/90 px-8 backdrop-blur-sm">
      <div>
        <p className="text-sm text-[#9CA3AF]">Panel operativo</p>
      </div>

      <div className="flex w-full max-w-xl items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Buscar expedientes, trámites, proyectos..."
            className="w-[520px] rounded-xl border border-[#1E293B] bg-[#111827] py-2.5 pl-9 pr-4 text-sm text-[#F9FAFB] placeholder-[#9CA3AF] focus:border-[#EAB308]/50 focus:outline-none"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#1E293B] px-2 py-0.5 text-xs text-[#9CA3AF]">
            Ctrl K
          </kbd>
        </div>

        <button className="relative rounded-lg p-2 text-[#9CA3AF] transition-all hover:bg-[#1E293B] hover:text-[#F9FAFB]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EAB308]" />
        </button>
      </div>
    </header>
  );
}
