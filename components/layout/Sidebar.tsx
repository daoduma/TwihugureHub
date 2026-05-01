// components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  BarChart2,
  Settings,
  ScrollText,
  Headphones,
  Database,
  Ticket,
  User,
  Sprout,
} from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  // Shared
  { href: "/farmer/dashboard",  labelKey: "nav.dashboard",      icon: LayoutDashboard, roles: ["FARMER"] },
  { href: "/farmer/courses",    labelKey: "nav.myLearning",     icon: BookOpen,        roles: ["FARMER"] },
  { href: "/farmer/profile",    labelKey: "nav.profile",        icon: User,            roles: ["FARMER"] },

  { href: "/trainer/dashboard", labelKey: "nav.dashboard",      icon: LayoutDashboard, roles: ["TRAINER"] },
  { href: "/trainer/courses",   labelKey: "nav.courses",        icon: GraduationCap,   roles: ["TRAINER"] },
  { href: "/trainer/farmers",   labelKey: "nav.farmers",        icon: Sprout,          roles: ["TRAINER"] },
  { href: "/trainer/reports",   labelKey: "nav.reports",        icon: BarChart2,       roles: ["TRAINER"] },
  { href: "/trainer/profile",   labelKey: "nav.profile",        icon: User,            roles: ["TRAINER"] },

  { href: "/admin/dashboard",   labelKey: "nav.dashboard",      icon: LayoutDashboard, roles: ["ADMIN"] },
  { href: "/admin/users",       labelKey: "nav.users",          icon: Users,           roles: ["ADMIN"] },
  { href: "/admin/courses",     labelKey: "nav.courses",        icon: BookOpen,        roles: ["ADMIN"] },
  { href: "/admin/reports",     labelKey: "nav.reports",        icon: BarChart2,       roles: ["ADMIN"] },
  { href: "/admin/audit-logs",  labelKey: "nav.auditLogs",      icon: ScrollText,      roles: ["ADMIN"] },
  { href: "/admin/settings",    labelKey: "nav.settings",       icon: Settings,        roles: ["ADMIN"] },

  { href: "/mbaza/dashboard",   labelKey: "nav.dashboard",      icon: LayoutDashboard, roles: ["MBAZA_STAFF"] },
  { href: "/mbaza/knowledge",   labelKey: "nav.knowledgeBase",  icon: Database,        roles: ["MBAZA_STAFF"] },
  { href: "/mbaza/tickets",     labelKey: "nav.supportTickets", icon: Ticket,          roles: ["MBAZA_STAFF"] },
  { href: "/mbaza/analytics",   labelKey: "nav.analytics",      icon: BarChart2,       roles: ["MBAZA_STAFF"] },
  { href: "/mbaza/profile",     labelKey: "nav.profile",        icon: User,            roles: ["MBAZA_STAFF"] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const pathname = usePathname();
  const userRole = session?.user?.role as Role | undefined;

  if (!userRole) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed left-0 z-40 flex flex-col border-r border-brand-100 bg-brand-900",
          "transition-transform duration-300 ease-in-out",
          // Desktop: always visible
          "lg:translate-x-0",
          // Mobile: toggle
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          width: "var(--sidebar-width)",
          top: "var(--navbar-height)",
          bottom: 0,
        }}
      >
        {/* Role badge */}
        <div className="border-b border-brand-800 px-5 py-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-800 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              {t(`roles.${userRole.toLowerCase().replace("_", "")}` as never) ||
                userRole.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      "transition-all duration-150",
                      isActive
                        ? "bg-brand-700 text-white shadow-sm"
                        : "text-brand-300 hover:bg-brand-800 hover:text-white"
                    )}
                  >
                    <Icon
                      size={17}
                      className={cn(
                        "shrink-0 transition-transform duration-150 group-hover:scale-110",
                        isActive ? "text-brand-200" : "text-brand-400"
                      )}
                    />
                    <span>{t(item.labelKey as never)}</span>

                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-earth-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-brand-800 px-5 py-3">
          <p className="text-[10px] text-brand-600">
            © {new Date().getFullYear()} TwihugureHub
          </p>
        </div>
      </aside>
    </>
  );
}
