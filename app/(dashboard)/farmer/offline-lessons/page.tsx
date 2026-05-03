// app/(dashboard)/farmer/offline-lessons/page.tsx
"use client";

import { useState, useEffect } from "react";
import { BookOpen, Trash2, WifiOff, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { getAllLessons, deleteLesson, type OfflineLesson } from "@/lib/offlineStorage";
import { format } from "date-fns";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";


export default function OfflineLessonsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language ?? "en") as "en" | "fr" | "rw";

  const [lessons, setLessons] = useState<OfflineLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllLessons()
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(id: string) {
    await deleteLesson(id).catch(() => {});
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }

  function getTitle(t: Record<string, string>) {
    return t[lang] ?? t["en"] ?? "Lesson";
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <WifiOff size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("offline.myLessons")}</h1>
            <p className="text-xs text-gray-400">{t("offline.myLessonsSubtitle")}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
            {t("common.loading")}
          </div>
        ) : lessons.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
            <WifiOff size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-600">{t("offline.noLessons")}</p>
            <p className="mt-1 text-xs text-gray-400">{t("offline.noLessonsHint")}</p>
            <Link
              href="/farmer/courses"
              className="mt-4 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
            >
              {t("certificates.browseCourses")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <BookOpen size={18} className="text-brand-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {getTitle(lesson.title)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {getTitle(lesson.courseTitle)}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {t("offline.savedOn")} {format(new Date(lesson.savedAt), "PPP")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/farmer/courses/${lesson.courseId}/lessons/${lesson.id}`}
                    className="flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors"
                  >
                    {t("offline.viewLesson")}
                    <ArrowRight size={11} />
                  </Link>
                  <button
                    onClick={() => handleRemove(lesson.id)}
                    className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title={t("offline.removeDownload")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
