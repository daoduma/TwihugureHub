// components/layout/Navbar.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { useTranslation } from "@/lib/useTranslation";
import { getInitials, getRoleI18nKey } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavbarProps {
  onMenuToggle?: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
              <path
                d="M12 2C8.5 2 6 5 6 8c0 2.5 1.5 4.5 4 6l2 1.5L14 14c2.5-1.5 4-3.5 4-6 0-3-2.5-6-6-6z"
                fill="currentColor"
                opacity="0.9"
              />
              <path
                d="M12 15.5V22M9 22h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
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
