"use client";
// app/(dashboard)/trainer/reports/page.tsx

import { useState, useEffect } from "react";
import { BookOpen, Users, Award, TrendingUp, CheckCircle } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

type CourseStatus = "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "ARCHIVED";

interface CourseStat {
  id: string;
  title: string;
  status: CourseStatus;
  createdAt: string;
  totalEnrolled: number;
  completed: number;
  avgProgress: number;
  completionRate: number;
}

interface Summary {
  totalCourses: number;
  publishedCourses: number;
  totalFarmers: number;
  totalEnrolled: number;
  totalCompleted: number;
  overallCompletion: number;
}

const STATUS_STYLES: Record<CourseStatus, string> = {
  PUBLISHED:        "bg-green-100 text-green-700",
  DRAFT:            "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  ARCHIVED:         "bg-red-100 text-red-600",
};

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-500">{value}%</span>
    </div>
  );
}

export default function TrainerReportsPage() {
  const { t } = useTranslation();
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [courses, setCourses]     = useState<CourseStat[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/trainer/reports")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary);
        setCourses(d.courseStats ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = summary
    ? [
        { label: t("trainer.reports.statTotalCourses"),     value: summary.totalCourses,     icon: BookOpen,   color: "text-blue-600",   bg: "bg-blue-50" },
        { label: t("trainer.reports.statPublished"),          value: summary.publishedCourses,  icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
        { label: t("trainer.reports.statUniqueFarmers"),     value: summary.totalFarmers,      icon: Users,      color: "text-purple-600", bg: "bg-purple-50" },
        { label: t("trainer.reports.statOverallCompletion"), value: `${summary.overallCompletion}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
      ]
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
          {t("trainer.reports.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("trainer.reports.subtitle")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="h-4 w-24 rounded bg-gray-100 animate-pulse mb-3" />
                <div className="h-8 w-16 rounded bg-gray-100 animate-pulse" />
              </div>
            ))
          : statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{card.label}</span>
                    <span className={`rounded-lg p-2 ${card.bg}`}>
                      <Icon size={16} className={card.color} />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
              );
            })}
      </div>

      {/* Per-course breakdown */}
      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{t("trainer.reports.courseBreakdown")}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {[t("trainer.reports.colCourse"), t("trainer.reports.colStatus"), t("trainer.reports.colEnrolled"), t("trainer.reports.colCompleted"), t("trainer.reports.colAvgProgress"), t("trainer.reports.colCompletionRate")].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="px-5 py-3">
                    <div className="h-4 rounded bg-gray-100 animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && courses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <Award size={32} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">{t("trainer.reports.noCourses")}</p>
                </td>
              </tr>
            )}
            {!loading && courses.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[c.status]}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3 text-center font-medium text-gray-700">{c.totalEnrolled}</td>
                <td className="px-5 py-3 text-center font-medium text-gray-700">{c.completed}</td>
                <td className="px-5 py-3"><ProgressBar value={c.avgProgress} /></td>
                <td className="px-5 py-3">
                  <span className={`font-semibold text-sm ${c.completionRate >= 70 ? "text-green-600" : c.completionRate >= 30 ? "text-amber-600" : "text-red-500"}`}>
                    {c.completionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
