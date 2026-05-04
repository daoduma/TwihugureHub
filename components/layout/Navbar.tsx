// components/layout/Navbar.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { useTranslation } from "@/lib/useTranslation";
import { getInitials, getRoleI18nKey } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePWAInstall } from "@/lib/usePWAInstall";

interface NavbarProps {
  onMenuToggle?: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { canPrompt, platform, triggerInstall, isInstalled } = usePWAInstall();

  const user = session?.user;
  const initials = user?.name ? getInitials(user.name) : "?";

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4
                 border-b border-brand-100 bg-white px-4 shadow-sm"
      style={{ height: "var(--navbar-height)" }}
    >
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-700 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          {/* Logo icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden shadow-sm">
            <img src="/icons/icon.svg" alt="TwihugureHub" className="h-8 w-8" />
          </div>
          <span
            className="hidden text-lg font-semibold text-brand-900 sm:block"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TwihugureHub
          </span>
        </Link>
      </div>

      {/* Right: language + notifications + user */}
      <div className="flex items-center gap-2">
        <LanguageSelector variant="light" />

        {/* Install button — shown on desktop when the prompt is available */}
        {canPrompt && platform === "desktop" && (
          <button
            onClick={triggerInstall}
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
            title={t("pwa.installTitle" as never) || "Install App"}
          >
            <Download size={13} />
            {t("pwa.installButton" as never) || "Install App"}
          </button>
        )}

        <NotificationBell />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-brand-50 transition-colors"
            aria-expanded={showUserMenu}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white shadow">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name ?? "—"}</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {t(getRoleI18nKey(user?.role ?? ""))}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              {/* Dropdown */}
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-brand-100 bg-white py-1 shadow-lg animate-fade-in">
                <div className="border-b border-brand-50 px-4 py-2">
                  <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  {t("auth.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
