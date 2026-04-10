'use client';

import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import clsx from 'clsx';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      <Topbar isSidebarCollapsed={isSidebarCollapsed} />
      
      <main
        className={clsx(
          'pt-16 min-h-screen transition-all duration-300',
          isSidebarCollapsed ? 'ml-20' : 'ml-[280px]'
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
