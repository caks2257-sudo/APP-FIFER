import type { ReactNode } from "react";

/** Shell admin — grid 12 cols en páginas hijas (Master X-Ray). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-zinc-100" data-fifer-shell="admin">
      {children}
    </div>
  );
}
