// app/(dashboard)/farmer/courses/[courseId]/lessons/[lessonId]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CheckCircle, AlertTriangle,
  Download, FileText, WifiOff,
} from "lucide-react";
import { useTranslation, useContentLanguage } from "@/lib/useTranslation";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import type { Language } from "@/types";
import { DownloadLessonButton } from "@/components/pwa/DownloadLessonButton";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import {
  getLesson,
  type OfflineLesson,
} from "@/lib/offlineStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

interface LessonDetail {
  id: string;
  title: Record<string, string>;
  body: Record<string, string>;
  videoUrl: string | null;
  audioUrl: string | null;
  imageUrls: string[];
  moduleId: string;
  order: number;
  attachments: Attachment[];
  quiz: { id: string } | null;
  module: {
    courseId: string;
    lessons: { id: string; title: Record<string, string>; order: number }[];
    course: {
      title: Record<string, string>;
      modules: { lessons: { id: string; order: number }[] }[];
    };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBestLanguage(
  obj: Record<string, string>,
  preferred: string
): { text: string; lang: string | null } {
  if (obj[preferred]?.trim()) return { text: obj[preferred], lang: null };
  const fallbacks = ["en", "fr", "rw"].filter((l) => l !== preferred);
  for (const l of fallbacks) {
    if (obj[l]?.trim()) return { text: obj[l], lang: l };
  }
  return { text: "", lang: null };
}

const LANG_NAMES: Record<string, string> = {
  en: "English",
  fr: "French / Français",
  rw: "Kinyarwanda",
};

/** Convert a stored OfflineLesson to a minimal LessonDetail for the viewer. */
function offlineLessonToDetail(ol: OfflineLesson): LessonDetail {
  return {
    id: ol.id,
    title: ol.title,
    body: ol.body,
    videoUrl: ol.videoUrl ?? null,
    // Prefer embedded data URL (works offline) over original network URL
    audioUrl: ol.audioDataUrl ?? ol.audioUrl ?? null,
    imageUrls: ol.imageDataUrls ?? ol.imageUrls,
    moduleId: "",
    order: 0,
    attachments: [],  // attachments not stored offline
    quiz: null,       // quiz not available offline
    module: {
      courseId: ol.courseId,
      lessons: [],
      course: {
        title: ol.courseTitle,
        modules: [],
      },
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LessonViewerPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const lang = useContentLanguage();
  const isOnline = useOnlineStatus();

  const [lesson,       setLesson]       = useState<LessonDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [notDownloaded, setNotDownloaded] = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [isCompleted,  setIsCompleted]  = useState(false);
  const [marking,      setMarking]      = useState(false);
  const startedAt = useRef(Date.now());

  // ── Load lesson ─────────────────────────────────────────────────────────────
  useEffect(() => {
    startedAt.current = Date.now();
    setIsOfflineMode(false);
    setNotDownloaded(false);
    setApiError(null);
    setLoading(true);

    const load = async () => {
      // 1. If online, fetch from server (always freshest data)
      if (isOnline) {
        try {
          const res = await fetch(`/api/farmer/lessons/${lessonId}`);
          if (res.ok) {
            const data = await res.json();
            setLesson(data.lesson);
            // Check completion state
            const progressRes = await fetch(`/api/farmer/courses/${courseId}`);
            if (progressRes.ok) {
              const pd = await progressRes.json();
              setIsCompleted((pd.completedLessonIds || []).includes(lessonId));
            }
            setLoading(false);
            return;
          }
          // Server returned an error — do NOT silently fall through to offline path
          // Try to show a meaningful error message instead
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error || `Error loading lesson (${res.status})`;
          setApiError(errMsg);
          setLoading(false);
          return;
        } catch {
          // True network failure while online — fall through to IndexedDB
        }
      }

      // 2. Offline or network failed → try IndexedDB
      const cached = await getLesson(lessonId).catch(() => null);
      if (cached) {
        setLesson(offlineLessonToDetail(cached));
        setIsOfflineMode(true);
        setLoading(false);
        return;
      }

      // 3. Not in IndexedDB either
      setNotDownloaded(true);
      setLoading(false);
    };

    load();
  }, [lessonId, courseId, isOnline]);

  // ── Mark complete ───────────────────────────────────────────────────────────
  const markComplete = async () => {
    if (!isOnline) return; // can't record progress offline
    setMarking(true);
    const timeSpent = Math.round((Date.now() - startedAt.current) / 1000);
    const res = await fetch(`/api/farmer/lessons/${lessonId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSpentSeconds: timeSpent }),
    });
    if (res.ok) setIsCompleted(true);
    setMarking(false);
  };

  // ── Render states ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        {t("ui.loading" as never)}
      </div>
    );
  }

  // API returned an error while online (e.g. not enrolled, not found, server error)
  if (apiError) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <AlertTriangle size={52} className="mx-auto text-red-400" />
        <h2 className="text-xl font-bold text-gray-800">
          {t("farmer.lesson.errorTitle" as never, { defaultValue: "Could not load lesson" })}
        </h2>
        <p className="text-sm text-gray-500">{apiError}</p>
        <Link
          href={`/farmer/courses/${courseId}`}
          className="btn btn-outline flex items-center gap-2 justify-center"
        >
          <ArrowLeft size={15} />
          {t("farmer.lesson.backToCourse" as never, { defaultValue: "Back to Course" })}
        </Link>
      </div>
    );
  }

  // Completely offline and the lesson was never downloaded
  if (notDownloaded) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <WifiOff size={52} className="mx-auto text-amber-400" />
        <h2 className="text-xl font-bold text-gray-800">
          {t("offline.notAvailableTitle" as never) || "Lesson not available offline"}
        </h2>
        <p className="text-sm text-gray-500">
          {t("offline.notAvailableHint" as never) ||
            "You are offline and this lesson hasn't been downloaded. Connect to the internet to continue, or download lessons in advance."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href={`/farmer/courses/${courseId}`}
            className="btn btn-outline flex items-center gap-2"
          >
            <ArrowLeft size={15} />
            {t("farmer.lesson.backToCourse" as never) || "Back to Course"}
          </Link>
          <Link
            href="/farmer/offline-lessons"
            className="btn btn-primary flex items-center gap-2"
          >
            <WifiOff size={15} />
            {t("nav.offlineLessons" as never) || "My Downloads"}
          </Link>
        </div>
      </div>
    );
  }

  if (!lesson) return <div className="text-center py-12">Lesson not found.</div>;

  const bodyResult  = getBestLanguage(lesson.body  as Record<string, string>, lang);
  const titleResult = getBestLanguage(lesson.title as Record<string, string>, lang);

  // Prev / next (not available in offline mode — module.course.modules is empty)
  const allLessons = lesson.module.course.modules
    .flatMap((m) => m.lessons)
    .sort((a, b) => a.order - b.order);
  const currentIdx = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">

      {/* ── Offline mode banner ─────────────────────────────────────── */}
      {isOfflineMode && (
        <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <WifiOff size={16} className="shrink-0" />
          <span>
            {t("offline.viewingOffline" as never) ||
              "You're offline — viewing your downloaded copy. Progress and quiz submission require a connection."}
          </span>
        </div>
      )}

      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href={`/farmer/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft size={16} />
          {t("farmer.lesson.backToCourse" as never) || "Back to Course"}
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download button — only shown when online so we have fresh content */}
          {lesson && isOnline && (
            <DownloadLessonButton
              compact
              lesson={{
                id:          lesson.id,
                title:       lesson.title,
                body:        lesson.body,
                videoUrl:    lesson.videoUrl,
                audioUrl:    lesson.audioUrl,
                imageUrls:   lesson.imageUrls,
                courseId,
                courseTitle: lesson.module?.course?.title ?? {},
                savedAt:     new Date().toISOString(),
              }}
            />
          )}
          {prevLesson && (
            <Link
              href={`/farmer/courses/${courseId}/lessons/${prevLesson.id}`}
              className="btn btn-outline text-xs py-1.5"
            >
              ← {t("farmer.lesson.previous" as never) || "Previous"}
            </Link>
          )}
          {nextLesson && (
            <Link
              href={`/farmer/courses/${courseId}/lessons/${nextLesson.id}`}
              className="btn btn-outline text-xs py-1.5"
            >
              {t("farmer.lesson.next" as never) || "Next"} →
            </Link>
          )}
        </div>
      </div>

      {/* ── Language fallback banner ─────────────────────────────────── */}
      {bodyResult.lang && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            {t("farmer.lesson.languageFallback" as never) ||
              `This lesson is not yet available in ${LANG_NAMES[lang] || lang}. Showing ${LANG_NAMES[bodyResult.lang] || bodyResult.lang} version.`}
          </span>
        </div>
      )}

      {/* ── Title ───────────────────────────────────────────────────── */}
      <h1
        className="text-2xl font-bold text-brand-900"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {titleResult.text}
      </h1>

      {/* ── Video ───────────────────────────────────────────────────── */}
      {lesson.videoUrl && (
        <div className="space-y-1">
          <VideoPlayer url={lesson.videoUrl} title={titleResult.text} />
          {isOfflineMode && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <WifiOff size={11} />
              {t("offline.videoUnavailableOffline" as never) ||
                "YouTube videos require an internet connection."}
            </p>
          )}
        </div>
      )}

      {/* ── Images ──────────────────────────────────────────────────── */}
      {lesson.imageUrls && lesson.imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {lesson.imageUrls.map((url, i) => (
            <img key={i} src={url} alt="" className="rounded-lg w-full object-cover" />
          ))}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────── */}
      {bodyResult.text && <MarkdownContent source={bodyResult.text} />}

      {/* ── Audio ───────────────────────────────────────────────────── */}
      {lesson.audioUrl && (
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t("farmer.lesson.audio" as never) || "Audio"}
          </p>
          <audio controls className="w-full" src={lesson.audioUrl} />
        </div>
      )}

      {/* ── Attachments ─────────────────────────────────────────────── */}
      {lesson.attachments && lesson.attachments.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            {t("farmer.lesson.attachments" as never) || "Attachments"}
          </p>
          {lesson.attachments.map((att) => (
            <a
              key={att.id}
              href={att.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 hover:underline"
            >
              <FileText size={15} />
              {att.fileName}
              <Download size={13} className="ml-auto text-gray-400" />
            </a>
          ))}
        </div>
      )}

      {/* ── Offline notice: no attachments in cache ──────────────────── */}
      {isOfflineMode && (
        <p className="text-xs text-gray-400 text-center">
          {t("offline.attachmentsNote" as never) ||
            "Attachments are not available offline."}
        </p>
      )}

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        {isOfflineMode ? (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <WifiOff size={16} />
            {t("offline.progressNote" as never) ||
              "Connect to the internet to mark this lesson complete."}
          </div>
        ) : isCompleted ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle size={20} />
            {t("farmer.lesson.completed" as never) || "Lesson completed!"}
          </div>
        ) : (
          <button onClick={markComplete} disabled={marking} className="btn btn-primary w-full">
            {marking
              ? (t("ui.loading" as never) || "…")
              : (t("farmer.lesson.markComplete" as never) || "Mark as Complete")}
          </button>
        )}

        {isCompleted && lesson.quiz && !isOfflineMode && (
          <Link
            href={`/farmer/courses/${courseId}/lessons/${lessonId}/quiz`}
            className="btn btn-outline w-full text-center block"
          >
            🎯 {t("farmer.lesson.takeQuiz" as never) || "Take Quiz"}
          </Link>
        )}

        {isOfflineMode && lesson.quiz && (
          <p className="text-xs text-gray-400 text-center">
            {t("offline.quizNote" as never) ||
              "Quizzes are not available offline."}
          </p>
        )}
      </div>

      {/* ── Bottom nav ──────────────────────────────────────────────── */}
      <div className="flex justify-between pb-8">
        {prevLesson ? (
          <Link
            href={`/farmer/courses/${courseId}/lessons/${prevLesson.id}`}
            className="btn btn-outline flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t("farmer.lesson.previous" as never) || "Previous"}
          </Link>
        ) : (
          <div />
        )}
        {nextLesson && (
          <Link
            href={`/farmer/courses/${courseId}/lessons/${nextLesson.id}`}
            className="btn btn-primary flex items-center gap-2"
          >
            {t("farmer.lesson.next" as never) || "Next"}
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
