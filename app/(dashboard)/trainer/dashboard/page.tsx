// app/(dashboard)/trainer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Users, Plus, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { StatusBadge } from "@/components/trainer/StatusBadge";
import type { CourseStatus } from "@/types";

interface Stats {
  totalCourses: number;
  publishedCourses: number;
  pendingApproval: number;
  totalEnrolledFarmers: number;
  recentActivity: {
    id: string;
    title: { en: string; fr: string; rw: string };
    status: CourseStatus;
    updatedAt: string;
  }[];
}


export default function TrainerDashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en") as "en" | "fr" | "rw";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trainer/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: t("trainer.dashboard.totalCourses"),
      value: stats?.totalCourses ?? 0,
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: t("trainer.dashboard.publishedCourses"),
      value: stats?.publishedCourses ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: t("trainer.dashboard.pendingApproval"),
      value: stats?.pendingApproval ?? 0,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: t("trainer.dashboard.enrolledFarmers"),
      value: stats?.totalEnrolledFarmers ?? 0,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("trainer.dashboard.title")}</h1>
          <p className="text-gray-500 mt-1">{t("trainer.dashboard.subtitle")}</p>
        </div>
        <Link
          href="/trainer/courses/new"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Plus size={16} />
          {t("trainer.courses.createNew")}
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{card.label}</span>
                <span className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon size={18} className={card.color} />
                </span>
              </div>
              {loading ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-3" />
              ) : (
                <p className="text-3xl font-bold text-gray-900 mt-3">{card.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{t("trainer.dashboard.recentActivity")}</h2>
          <RefreshCw
            size={16}
            className="text-gray-400 cursor-pointer hover:text-gray-600"
            onClick={() => {
              setLoading(true);
              fetch("/api/trainer/stats")
                .then((r) => r.json())
                .then((d) => d.success && setStats(d.data))
                .finally(() => setLoading(false));
            }}
          />
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="h-4 bg-gray-100 animate-pulse rounded flex-1" />
                <div className="h-5 w-20 bg-gray-100 animate-pulse rounded" />
              </div>
            ))
          ) : stats?.recentActivity.length === 0 ? (
            <p className="px-6 py-8 text-sm text-center text-gray-400">
              {t("trainer.dashboard.noActivity")}
            </p>
          ) : (
            stats?.recentActivity.map((item) => (
              <Link
                key={item.id}
                href={`/trainer/courses/${item.id}/edit`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {(item.title as Record<string, string>)[lang] || item.title.en || t("trainer.courses.untitled")}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("trainer.dashboard.lastUpdated")}:{" "}
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
