// app/(dashboard)/farmer/courses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, Filter, BookOpen } from "lucide-react";
import { useTranslation, useContentLanguage } from "@/lib/useTranslation";

interface Course {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  thumbnailUrl: string | null;
  modules: { lessons: { id: string }[] }[];
  _count: { modules: number };
}

interface Enrollment {
  courseId: string;
  progressPercent: number;
  completedAt: string | null;
  course: Course;
}

function getText(obj: Record<string, string>, lang: string): string {
  return obj[lang] || obj["en"] || obj["fr"] || obj["rw"] || "";
}


export default function FarmerCoursesPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const lang = useContentLanguage();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [recommended, setRecommended] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/farmer/courses")
      .then((r) => r.json())
      .then((data) => {
        setEnrollments(data.enrollments || []);
        setRecommended(data.recommended || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const allCourses: Array<Course & { enrollment?: Enrollment }> = [
    ...enrollments.map((e) => ({ ...e.course, enrollment: e })),
    ...recommended,
  ];

  const filtered = allCourses.filter((c) => {
    const title = getText(c.title, lang).toLowerCase();
    return search === "" || title.includes(search.toLowerCase());
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          {t("farmer.courses.title" as never) || "Course Catalog"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("farmer.courses.subtitle" as never) || "Explore all available training courses"}</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ui.search" as never) || "Search courses..."}
            className="input pl-9 w-full"
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-40" />
          <p>{t("ui.noResults" as never) || "No courses found"}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            const enrollment = (course as { enrollment?: Enrollment }).enrollment;
            const title = getText(course.title, lang);
            const desc = getText(course.description, lang);
            const moduleCount = course._count?.modules ?? course.modules?.length ?? 0;

            return (
              <Link
                key={course.id}
                href={`/farmer/courses/${course.id}`}
                className="card p-4 hover:shadow-md transition-shadow group"
              >
                <div className="aspect-video bg-brand-100 rounded-lg mb-3 overflow-hidden relative">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🌾</div>
                  )}
                  {isEnrolled && (
                    <div className="absolute top-2 left-2 bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {t("farmer.courses.enrolled" as never) || "Enrolled"}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 line-clamp-2">{title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{desc}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{moduleCount} {t("farmer.course.modules" as never) || "modules"}</span>
                  {isEnrolled && enrollment && (
                    <span className="text-xs text-brand-600 font-medium">{enrollment.progressPercent}% {t("farmer.course.complete" as never) || "complete"}</span>
                  )}
                </div>
                {isEnrolled && enrollment && (
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${enrollment.progressPercent}%` }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
