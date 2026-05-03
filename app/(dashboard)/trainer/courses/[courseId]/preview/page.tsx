// app/(dashboard)/trainer/courses/[courseId]/preview/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ChevronDown, ChevronRight, Play, FileText, Headphones } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { StatusBadge } from "@/components/trainer/StatusBadge";
import type { Course, Module, Lesson } from "@/types";

type Lang = "en" | "fr" | "rw";

export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en") as Lang;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetch("/api/trainer/courses/" + courseId)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCourse(d.data);
          // Expand first module by default
          if (d.data.modules?.length > 0) {
            setExpandedModules(new Set([d.data.modules[0].id]));
            if (d.data.modules[0].lessons?.length > 0) {
              setSelectedLesson(d.data.modules[0].lessons[0]);
            }
          }
        }
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-green-600" />
      </div>
    );
  }

  if (!course) {
    return <div className="p-6 text-center text-gray-400">{t("errors.notFound")}</div>;
  }

  const courseTitle = (course.title as Record<string, string>)[lang] || course.title.en;
  const courseDesc = (course.description as Record<string, string>)[lang] || course.description.en;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/trainer/courses/" + courseId + "/edit")}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          ← {t("ui.back")} to Editor
        </button>
        <StatusBadge status={course.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: Module/Lesson navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Course header */}
            {course.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnailUrl} alt="" className="w-full h-36 object-cover" />
            )}
            <div className="p-4 border-b border-gray-100">
              <h1 className="font-bold text-gray-900">{courseTitle}</h1>
              {courseDesc && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{courseDesc}</p>}
            </div>
            {/* Modules */}
            <div className="divide-y divide-gray-50">
              {(course.modules ?? []).map((mod: Module) => {
                const modTitle = (mod.title as Record<string, string>)[lang] || mod.title.en;
                const expanded = expandedModules.has(mod.id);
                return (
                  <div key={mod.id}>
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="flex items-center gap-2 w-full px-4 py-3 hover:bg-gray-50 text-left"
                    >
                      {expanded ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
                      <span className="text-sm font-medium text-gray-800">{modTitle}</span>
                      <span className="ml-auto text-xs text-gray-400">{(mod.lessons ?? []).length}</span>
                    </button>
                    {expanded && (
                      <div className="divide-y divide-gray-50 bg-gray-50/50">
                        {(mod.lessons ?? []).map((lesson: Lesson) => {
                          const lessonTitle = (lesson.title as Record<string, string>)[lang] || lesson.title.en;
                          const isActive = selectedLesson?.id === lesson.id;
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setSelectedLesson(lesson)}
                              className={`flex items-center gap-2 w-full px-6 py-2.5 text-left text-sm transition-colors ${
                                isActive ? "bg-green-50 text-green-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Play size={11} className={isActive ? "text-green-600" : "text-gray-300"} />
                              {lessonTitle}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main lesson content */}
        <div className="lg:col-span-2">
          {selectedLesson ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="text-xl font-bold text-gray-900">
                {(selectedLesson.title as Record<string, string>)[lang] || selectedLesson.title.en}
              </h2>

              {selectedLesson.videoUrl && (
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                  <iframe
                    src={selectedLesson.videoUrl.replace("watch?v=", "embed/")}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}

              {selectedLesson.audioUrl && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <Headphones size={18} className="text-gray-400" />
                  <audio controls src={selectedLesson.audioUrl} className="flex-1" />
                </div>
              )}

              {(selectedLesson.body as Record<string, string>)?.[lang] && (
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: (selectedLesson.body as Record<string, string>)[lang] || "",
                  }}
                />
              )}

              {selectedLesson.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedLesson.imageUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="rounded-lg w-full object-cover" />
                  ))}
                </div>
              )}

              {(selectedLesson.attachments ?? []).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
                  {(selectedLesson.attachments ?? []).map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 mb-1"
                    >
                      <FileText size={14} />
                      {att.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <p>{t("trainer.lessons.selectLesson" as never)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
