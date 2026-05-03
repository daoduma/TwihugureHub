// components/layout/DashboardShell.tsx
"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useOfflineSync } from "@/lib/useOfflineSync";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useOfflineSync();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          paddingTop: "var(--navbar-height)",
          paddingLeft: "0px",
        }}
      >
        {/* Desktop: offset for sidebar */}
        <div className="lg:pl-[var(--sidebar-width)]">
          <div className="p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          paddingTop: "var(--navbar-height)",
          paddingLeft: "0px",
        }}
      >
        {/* Desktop: offset for sidebar */}
        <div className="lg:pl-[var(--sidebar-width)]">
          <div className="p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
