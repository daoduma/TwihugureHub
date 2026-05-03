// app/notifications/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";

interface NotificationItem {
  id: string;
  type: string;
  title: Record<string, string>;
  body: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  total: number;
  totalPages: number;
  limit: number;
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


// CHANGED: Added page title for browser <title> tags
export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language ?? "en") as "en" | "fr" | "rw";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${p}&limit=20`);
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function getTitle(n: NotificationItem) {
    return n.title[lang] ?? n.title["en"] ?? "";
  }

  function getBody(n: NotificationItem) {
    return n.body[lang] ?? n.body["en"] ?? "";
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <Bell size={20} className="text-brand-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t("notifications.title")}</h1>
              {pagination && (
                <p className="text-xs text-gray-400">
                  {pagination.total} {t("notifications.total")}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors"
          >
            <CheckCheck size={14} />
            {t("notifications.markAllRead")}
          </button>
        </div>

        {/* List */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">{t("common.loading")}</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-4 px-6 py-4 transition-colors",
                    !n.isRead && "bg-brand-50/30",
                    n.isRead ? "cursor-default" : "cursor-pointer hover:bg-gray-50"
                  )}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className="shrink-0 pt-0.5">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                        typeColors[n.type] ?? "bg-gray-100 text-gray-500"
                      )}
                    >
                      {n.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold text-gray-800", !n.isRead && "text-brand-900")}>
                      {getTitle(n)}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">{getBody(n)}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={14} />
              {t("common.previous")}
            </button>
            <span className="text-sm text-gray-500">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              {t("common.next")}
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
