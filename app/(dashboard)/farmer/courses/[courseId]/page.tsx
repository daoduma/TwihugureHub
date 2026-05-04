// app/(dashboard)/farmer/courses/[courseId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, CheckCircle, Star, ArrowLeft, BookOpen, PlayCircle } from "lucide-react";
import { useTranslation, useContentLanguage } from "@/lib/useTranslation";

interface LessonItem {
  id: string;
  title: Record<string, string>;
  order: number;
  quiz: { id: string } | null;
}
interface ModuleItem {
  id: string;
  title: Record<string, string>;
  order: number;
  lessons: LessonItem[];
}
interface CourseDetail {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  thumbnailUrl: string | null;
  modules: ModuleItem[];
  trainer: { name: string };
}
interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  farmer: { name: string };
}

function getText(obj: Record<string, string>, lang: string): string {
  return obj[lang] || obj["en"] || obj["fr"] || obj["rw"] || "";
}

export default function CourseDetailPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lang = useContentLanguage();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [enrollment, setEnrollment] = useState<{ progressPercent: number } | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/farmer/courses/${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        setCourse(data.course);
        setEnrollment(data.enrollment);
        setCompletedLessonIds(new Set(data.completedLessonIds || []));
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating);
        if (data.course?.modules?.length > 0) {
          setOpenModules(new Set([data.course.modules[0].id]));
        }
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleEnroll = async () => {
    setEnrolling(true);
    const res = await fetch(`/api/farmer/courses/${courseId}/enroll`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setEnrollment(data.enrollment);
    }
    setEnrolling(false);
  };

  const handleContinue = () => {
    if (!course) return;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!completedLessonIds.has(lesson.id)) {
          router.push(`/farmer/courses/${courseId}/lessons/${lesson.id}`);
          return;
        }
      }
    }
    // All lessons complete — go back to first lesson (if it exists)
    const firstLessonId = course.modules[0]?.lessons[0]?.id;
    if (firstLessonId) {
      router.push(`/farmer/courses/${courseId}/lessons/${firstLessonId}`);
    }
  };

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    await fetch(`/api/farmer/courses/${courseId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
    });
    // Refresh
    const data = await fetch(`/api/farmer/courses/${courseId}`).then((r) => r.json());
    setReviews(data.reviews || []);
    setAverageRating(data.averageRating);
    setSubmittingReview(false);
    setReviewComment("");
  };

  if (loading) return <div className="text-center py-12 text-gray-400">{t("ui.loading" as never)}</div>;
  if (!course) return <div className="text-center py-12 text-gray-500">Course not found.</div>;

  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <Link href="/farmer/courses" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
        <ArrowLeft size={16} /> {t("ui.back" as never) || "Back to Courses"}
      </Link>

      {/* Hero */}
      <div className="card overflow-hidden">
        {course.thumbnailUrl && (
          <img src={course.thumbnailUrl} alt={getText(course.title, lang)} className="w-full h-56 object-cover" />
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
            {getText(course.title, lang)}
          </h1>
          <p className="mt-2 text-gray-600">{getText(course.description, lang)}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><BookOpen size={15} /> {course.modules.length} {t("farmer.course.modules" as never) || "modules"}</span>
            <span className="flex items-center gap-1"><PlayCircle size={15} /> {totalLessons} {t("farmer.course.lessons" as never) || "lessons"}</span>
            {averageRating && <span className="flex items-center gap-1"><Star size={15} className="text-yellow-400" /> {averageRating.toFixed(1)}</span>}
          </div>

          {enrollment ? (
            <div className="mt-5 space-y-3">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{t("farmer.course.progress" as never) || "Progress"}</span>
                  <span>{enrollment.progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${enrollment.progressPercent}%` }} />
                </div>
              </div>
              <button onClick={handleContinue} className="btn btn-primary w-full">
                {t("farmer.course.continueLearning" as never) || "Continue Learning"} →
              </button>
            </div>
          ) : (
            <button onClick={handleEnroll} disabled={enrolling} className="btn btn-primary mt-5 w-full">
              {enrolling ? (t("ui.loading" as never) || "...") : (t("farmer.course.enroll" as never) || "Enroll in this Course")}
            </button>
          )}
        </div>
      </div>

      {/* Module/Lesson list */}
      <div className="card divide-y divide-gray-100">
        <div className="px-5 py-3 font-semibold text-gray-700">{t("farmer.course.curriculum" as never) || "Course Curriculum"}</div>
        {course.modules.map((mod) => {
          const isOpen = openModules.has(mod.id);
          const completedInModule = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length;
          return (
            <div key={mod.id}>
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <span className="font-medium text-gray-800">{getText(mod.title, lang)}</span>
                </div>
                <span className="text-xs text-gray-400">{completedInModule}/{mod.lessons.length}</span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-50">
                  {mod.lessons.map((lesson) => {
                    const isDone = completedLessonIds.has(lesson.id);
                    return (
                      <Link
                        key={lesson.id}
                        href={enrollment ? `/farmer/courses/${courseId}/lessons/${lesson.id}` : "#"}
                        onClick={!enrollment ? (e) => e.preventDefault() : undefined}
                        className={`flex items-center gap-3 px-8 py-2.5 text-sm transition-colors ${enrollment ? "hover:bg-brand-50 cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                      >
                        {isDone ? (
                          <CheckCircle size={15} className="text-green-500 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 shrink-0" />
                        )}
                        <span className={isDone ? "text-gray-500 line-through" : "text-gray-700"}>
                          {getText(lesson.title, lang)}
                        </span>
                        {lesson.quiz && <span className="ml-auto text-xs text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">Quiz</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reviews */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{t("farmer.course.reviews" as never) || "Reviews"}</h2>
          {averageRating && (
            <span className="flex items-center gap-1 text-yellow-500 font-bold">
              <Star size={16} fill="currentColor" /> {averageRating.toFixed(1)}
            </span>
          )}
        </div>

        {reviews.map((r) => (
          <div key={r.id} className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <Star key={s} size={13} className={s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />)}</div>
              <span className="text-sm font-medium text-gray-700">{r.farmer.name}</span>
            </div>
            {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
          </div>
        ))}

        {enrollment && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">{t("farmer.course.leaveReview" as never) || "Leave a Review"}</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setReviewRating(s)}>
                  <Star size={22} className={s <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"} />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={t("farmer.course.reviewPlaceholder" as never) || "Share your experience..."}
              className="input w-full h-24 resize-none"
            />
            <button onClick={submitReview} disabled={submittingReview} className="btn btn-primary">
              {submittingReview ? "..." : (t("farmer.course.submitReview" as never) || "Submit Review")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
