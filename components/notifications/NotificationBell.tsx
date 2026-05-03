// components/notifications/NotificationBell.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/useTranslation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface NotificationItem {
  id: string;
  type: string;
  title: Record<string, string>;
  body: Record<string, string>;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language ?? "en") as "en" | "fr" | "rw";

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/notifications/unread-count");
      const data = await res.json();
      setUnreadCount(data.count ?? 0);
    } catch {}
  }, [session?.user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {}
    setLoading(false);
  }, [session?.user?.id]);

  // Poll every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  function getTitle(n: NotificationItem) {
    return n.title[lang] ?? n.title["en"] ?? "";
  }

  function getBody(n: NotificationItem) {
    return n.body[lang] ?? n.body["en"] ?? "";
  }

  const typeColors: Record<string, string> = {
    COURSE_APPROVED: "bg-green-100 text-green-700",
    COURSE_REJECTED: "bg-red-100 text-red-700",
    COURSE_ENROLLED: "bg-blue-100 text-blue-700",
    QUIZ_PASSED: "bg-emerald-100 text-emerald-700",
    QUIZ_FAILED: "bg-amber-100 text-amber-700",
    INTERVENTION_FLAG: "bg-orange-100 text-orange-700",
    MESSAGE_RECEIVED: "bg-purple-100 text-purple-700",
    TRANSLATION_READY: "bg-cyan-100 text-cyan-700",
    SYSTEM_ANNOUNCEMENT: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-brand-100 bg-white shadow-xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-50 px-4 py-3">
            <span className="text-sm font-semibold text-gray-800">
              {t("notifications.title")}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition-colors"
              >
                <CheckCheck size={13} />
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">
                {t("common.loading")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-gray-50",
                    !n.isRead && "bg-brand-50/40"
                  )}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className="mt-0.5 shrink-0">
                    <span
                      className={cn(
                        "inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                        typeColors[n.type] ?? "bg-gray-100 text-gray-500"
                      )}
                    >
                      {n.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold text-gray-800 truncate", !n.isRead && "text-brand-900")}>
                      {getTitle(n)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {getBody(n)}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-brand-50 px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition-colors"
            >
              {t("notifications.viewAll")}
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
