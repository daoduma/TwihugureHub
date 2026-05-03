// app/(dashboard)/farmer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Star } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import type { Language } from "@/types";

interface Enrollment {
  id: string;
  courseId: string;
  progressPercent: number;
  completedAt: string | null;
  enrolledAt: string;
  course: {
    id: string;
    title: Record<string, string>;
    description: Record<string, string>;
    thumbnailUrl: string | null;
    modules: { lessons: { id: string }[] }[];
  };
}

interface RecommendedCourse {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  thumbnailUrl: string | null;
  _count: { modules: number };
}

function getText(obj: Record<string, string>, lang: string): string {
  return obj[lang] || obj["en"] || obj["fr"] || obj["rw"] || "";
}


export default function FarmerDashboard() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const lang = (session?.user?.preferredLanguage as Language) || "en";

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [recommended, setRecommended] = useState<RecommendedCourse[]>([]);
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

  const inProgress = enrollments.filter((e) => !e.completedAt && e.progressPercent > 0);
  const notStarted = enrollments.filter((e) => e.progressPercent === 0 && !e.completedAt);
  const completed = enrollments.filter((e) => !!e.completedAt);

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          {t("farmer.dashboard.welcome" as never) || "Welcome back"}, {session?.user?.name} 🌱
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("farmer.dashboard.subtitle" as never) || "Your agricultural learning journey"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: <BookOpen size={20} className="text-brand-500" />, label: t("farmer.dashboard.inProgress" as never) || "In Progress", value: inProgress.length + notStarted.length, bg: "bg-brand-50" },
          { icon: <CheckCircle size={20} className="text-green-500" />, label: t("farmer.dashboard.completed" as never) || "Completed", value: completed.length, bg: "bg-green-50" },
          { icon: <Star size={20} className="text-earth-500" />, label: t("farmer.dashboard.recommended" as never) || "Recommended", value: recommended.length, bg: "bg-earth-50" },
        ].map((stat) => (
          <div key={stat.label} className="card p-5 flex items-center gap-4">
            <div className={`${stat.bg} h-10 w-10 rounded-xl flex items-center justify-center shrink-0`}>{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <Clock size={32} className="mx-auto mb-2 animate-spin" />
          <p>{t("ui.loading" as never)}</p>
        </div>
      )}

      {!loading && inProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("farmer.dashboard.continueLearning" as never) || "Continue Learning"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((e) => <CourseCard key={e.id} course={e.course} progress={e.progressPercent} lang={lang} />)}
          </div>
        </section>
      )}

      {!loading && notStarted.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("farmer.dashboard.enrolled" as never) || "My Enrolled Courses"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notStarted.map((e) => <CourseCard key={e.id} course={e.course} progress={0} lang={lang} />)}
          </div>
        </section>
      )}

      {!loading && completed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("farmer.dashboard.completedCourses" as never) || "Completed Courses"} 🏆</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((e) => <CourseCard key={e.id} course={e.course} progress={100} lang={lang} isCompleted />)}
          </div>
        </section>
      )}

      {!loading && recommended.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("farmer.dashboard.recommended" as never) || "Recommended for You"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 6).map((course) => (
              <Link key={course.id} href={`/farmer/courses/${course.id}`} className="card p-4 hover:shadow-md transition-shadow group">
                <div className="aspect-video bg-brand-100 rounded-lg mb-3 overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={getText(course.title, lang)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 line-clamp-2">{getText(course.title, lang)}</h3>
                <p className="text-sm text-gray-500 mt-1">{course._count?.modules ?? 0} {t("farmer.course.modules" as never) || "modules"}</p>
                <span className="mt-3 inline-block text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-full">{t("farmer.course.enrollNow" as never) || "Enroll →"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && enrollments.length === 0 && recommended.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{t("farmer.dashboard.noCourses" as never) || "No courses available yet"}</p>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, progress, lang, isCompleted = false }: {
  course: { id: string; title: Record<string, string>; thumbnailUrl: string | null };
  progress: number;
  lang: string;
  isCompleted?: boolean;
}) {
  const title = course.title[lang] || course.title["en"] || course.title["fr"] || course.title["rw"] || "";
  return (
    <Link href={`/farmer/courses/${course.id}`} className="card p-4 hover:shadow-md transition-shadow group">
      <div className="aspect-video bg-brand-100 rounded-lg mb-3 overflow-hidden relative">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🌾</div>
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <CheckCircle size={11} /> Done
          </div>
        )}
      </div>
      <h3 className="font-semibold text-gray-800 line-clamp-2">{title}</h3>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{progress}%</span></div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Link>
  );
}
