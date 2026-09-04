'use client';

import React, { useState } from 'react';
import { IconRail } from './IconRail';
import { SecondarySidebar } from './SecondarySidebar';
import { GlobalSearch } from './GlobalSearch';
import { AssistantDock } from '@/components/widgets/AssistantDock';
import { useNotificationRealtime } from '@/lib/socket';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useNotificationRealtime();

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-on-surface text-[13px]">
      <IconRail />
      <SecondarySidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 flex flex-col min-w-0 h-full bg-background relative">
        {children}
      </main>
      <GlobalSearch />
      <AssistantDock />
    </div>
  );
}
