// components/layout/DashboardShell.tsx
"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useOfflineSync } from "@/lib/useOfflineSync";
import { LanguageSync } from "@/components/providers/LanguageSync";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useOfflineSync();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Silently syncs session preferredLanguage → i18n on every page */}
      <LanguageSync />

      {/* Fixed top navbar */}
      <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} />

      {/* Fixed left sidebar — sits below navbar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset by navbar height on top, sidebar width on left (desktop) */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{ paddingTop: "var(--navbar-height)" }}
      >
        <div
          className="min-h-screen"
          style={{ paddingLeft: "0" }}
        >
          {/* On desktop, shift content right of the sidebar */}
          <div className="lg:pl-[220px]">
            <div className="p-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
