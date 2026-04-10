import {
  BookOpen,
  Building2,
  FileCheck2,
  Home,
  IdCard,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
  { icon: Building2, label: 'Recepción Municipal', href: '/dashboard/recepcion-municipal' },
  { icon: FileCheck2, label: 'Permisos de Edificación', href: '/dashboard/permisos-edificacion' },
  { icon: ShieldCheck, label: 'Regularizaciones', href: '/dashboard/regularizaciones' },
  { icon: BookOpen, label: 'Normativa OGUC/LGUC', href: '/dashboard/normativa' },
  { icon: IdCard, label: 'Perfil Profesional', href: '/dashboard/perfil-profesional' },
];

export default function Sidebar() {
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
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all ${
                  item.active
                    ? 'border-[#EAB308] bg-[#1E293B] text-[#F9FAFB]'
                    : 'border-transparent text-[#9CA3AF] hover:bg-[#1E293B]/70 hover:text-[#F9FAFB]'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[#1E293B] px-5 py-4">
        <p className="text-sm font-medium text-[#F9FAFB]">Carlos Mendoza</p>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">Administrador</p>
      </div>
    </aside>
  );
}
