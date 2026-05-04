// app/(dashboard)/trainer/courses/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, Eye, Send, Archive, ImageOff } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { StatusBadge } from "@/components/trainer/StatusBadge";
import type { Course } from "@/types";


export default function TrainerCoursesPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en") as "en" | "fr" | "rw";
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    fetch("/api/trainer/courses")
      .then((r) => r.json())
      .then((d) => d.success && setCourses(d.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleSubmit = async (id: string) => {
    if (!confirm(t("trainer.courses.confirmSubmit"))) return;
    const res = await fetch(`/api/trainer/courses/${id}/submit`, { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error ?? "Failed to submit for approval");
      return;
    }
    fetchCourses();
  };

  const handleArchive = async (id: string) => {
    if (!confirm(t("trainer.courses.confirmArchive"))) return;
    const res = await fetch(`/api/trainer/courses/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error ?? "Failed to archive course");
      return;
    }
    fetchCourses();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("trainer.courses.title")}</h1>
          <p className="text-gray-500 mt-1">{t("trainer.courses.subtitle")}</p>
        </div>
        <Link
          href="/trainer/courses/new"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Plus size={16} />
          {t("trainer.courses.createNew")}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-16 h-10 bg-gray-100 animate-pulse rounded" />
                <div className="flex-1 h-4 bg-gray-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">{t("trainer.courses.empty")}</p>
            <p className="text-sm mt-2">{t("trainer.courses.emptyHint")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t("trainer.courses.col.course")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  {t("ui.status")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  {t("trainer.courses.col.modules")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  {t("ui.createdAt")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t("ui.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {courses.map((course) => {
                const titleObj = course.title as Record<string, string>;
                const title = titleObj[lang] || titleObj.en || t("trainer.courses.untitled");
                return (
                  <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-9 rounded overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                          {course.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff size={14} className="text-gray-300" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 line-clamp-1">{title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <StatusBadge status={course.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                      {(course._count?.modules ?? 0)} {t("trainer.modules.label")}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                      {new Date(course.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/trainer/courses/${course.id}/edit`}
                          title={t("ui.edit")}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        >
                          <Pencil size={15} />
                        </Link>
                        <Link
                          href={`/trainer/courses/${course.id}/preview`}
                          title={t("trainer.courses.preview")}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        >
                          <Eye size={15} />
                        </Link>
                        {course.status === "DRAFT" && (
                          <button
                            onClick={() => handleSubmit(course.id)}
                            title={t("trainer.courses.submitApproval")}
                            className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600 hover:text-yellow-700"
                          >
                            <Send size={15} />
                          </button>
                        )}
                        {course.status === "DRAFT" && (
                          <button
                            onClick={() => handleArchive(course.id)}
                            title={t("trainer.courses.archive")}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          >
                            <Archive size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
