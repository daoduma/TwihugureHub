// components/layout/DashboardShell.tsx
"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useOfflineSync } from "@/lib/useOfflineSync";
import { LanguageSync } from "@/components/providers/LanguageSync";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSyncing, pendingCount, lastSynced } = useOfflineSync();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Silently syncs session preferredLanguage → i18n on every page */}
      <LanguageSync />

      {/* Offline/back-online banner — shown to all roles */}
      <OfflineBanner
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        lastSynced={lastSynced}
      />

      {/* Fixed top navbar */}
      <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} />

      {/* Fixed left sidebar — sits below navbar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{ paddingTop: "var(--navbar-height)" }}
      >
        <div className="min-h-screen">
          <div className="lg:pl-[220px]">
            <div className="p-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
