// components/pwa/DownloadLessonButton.tsx
"use client";

/**
 * Downloads a lesson for offline use.
 *
 * What gets saved:
 *   ✓ Lesson body (HTML text)           → IndexedDB
 *   ✓ Lesson images                     → fetched as data URLs → IndexedDB
 *   ✓ Audio file                        → fetched as data URL  → IndexedDB
 *   ✗ Self-hosted video                 → URL only (file too large to embed)
 *   ✗ YouTube video                     → never downloadable (YouTube policy)
 *
 * CORS note: images/audio must be served with CORS headers (Access-Control-Allow-Origin: *)
 * for the fetch to succeed. Most CDNs (Cloudinary, S3, Vercel Blob) allow this by default.
 * If a fetch fails, the original URL is kept as a fallback (works when online).
 */

import { useState, useEffect } from "react";
import { Download, Check, Loader2, Trash2, Music, Image as ImageIcon, AlertCircle } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import {
  saveLesson,
  deleteLesson,
  isLessonDownloaded,
  fetchAsDataUrl,
  type OfflineLesson,
} from "@/lib/offlineStorage";
import { cn } from "@/lib/utils";

interface DownloadLessonButtonProps {
  lesson:     OfflineLesson;
  className?: string;
  compact?:   boolean;
}

type DownloadStep = "idle" | "images" | "audio" | "saving" | "done" | "error";

const STEP_LABELS: Record<DownloadStep, string> = {
  idle:   "",
  images: "Saving images…",
  audio:  "Saving audio…",
  saving: "Saving…",
  done:   "Saved",
  error:  "Failed — tap to retry",
};

export function DownloadLessonButton({
  lesson,
  className,
  compact = false,
}: DownloadLessonButtonProps) {
  const { t }    = useTranslation();
  const isOnline = useOnlineStatus();

  const [downloaded, setDownloaded] = useState(false);
  const [step,       setStep]       = useState<DownloadStep>("idle");

  useEffect(() => {
    isLessonDownloaded(lesson.id)
      .then(setDownloaded)
      .catch(() => setDownloaded(false));
  }, [lesson.id]);

  // ── Download ──────────────────────────────────────────────────────────────

  async function handleDownload() {
    if (!isOnline) return;
    setStep("saving");

    try {
      const lessonToSave: OfflineLesson = { ...lesson, savedAt: new Date().toISOString() };

      // 1. Fetch images and embed as data URLs so they work offline
      if (lesson.imageUrls.length > 0) {
        setStep("images");
        const dataUrls = await Promise.all(lesson.imageUrls.map(fetchAsDataUrl));
        // Keep the data URL if we got one; fall back to the original URL
        lessonToSave.imageDataUrls = dataUrls.map((d, i) => d ?? lesson.imageUrls[i]);
      }

      // 2. Fetch audio and embed as data URL
      if (lesson.audioUrl) {
        setStep("audio");
        const audioData = await fetchAsDataUrl(lesson.audioUrl);
        // Store as data URL if successful; otherwise keep original URL
        lessonToSave.audioDataUrl = audioData ?? null;
      }

      // 3. Save everything to IndexedDB
      setStep("saving");
      await saveLesson(lessonToSave);
      setDownloaded(true);
      setStep("done");
    } catch (e) {
      console.error("Failed to save lesson offline:", e);
      setStep("error");
    }
  }

  async function handleRemove() {
    setStep("saving");
    try {
      await deleteLesson(lesson.id);
      setDownloaded(false);
      setStep("idle");
    } catch {
      setStep("error");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isWorking = step === "images" || step === "audio" || step === "saving";

  if (downloaded) {
    return (
      <button
        onClick={handleRemove}
        disabled={isWorking}
        className={cn(
          "group flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50",
          "px-3 py-1.5 text-xs font-medium text-green-700",
          "hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors",
          "disabled:opacity-50",
          compact && "px-2 py-1",
          className
        )}
        title={t("offline.removeDownload")}
      >
        {isWorking ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <>
            <Check size={12} className="group-hover:hidden" />
            <Trash2 size={12} className="hidden group-hover:block" />
          </>
        )}
        {!compact && (
          <>
            <span className="group-hover:hidden">{t("offline.downloaded")}</span>
            <span className="hidden group-hover:inline">{t("offline.removeDownload")}</span>
          </>
        )}
      </button>
    );
  }

  if (step === "error") {
    return (
      <button
        onClick={handleDownload}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50",
          "px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors",
          compact && "px-2 py-1",
          className
        )}
      >
        <AlertCircle size={12} />
        {!compact && (t("offline.retryDownload" as never) || "Retry")}
      </button>
    );
  }

  // Hidden when offline and not downloaded (nothing to do)
  if (!isOnline) return null;

  if (isWorking) {
    return (
      <button
        disabled
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white",
          "px-3 py-1.5 text-xs font-medium text-brand-700 opacity-70",
          compact && "px-2 py-1",
          className
        )}
      >
        {step === "images" ? (
          <ImageIcon size={12} className="animate-pulse" />
        ) : step === "audio" ? (
          <Music size={12} className="animate-pulse" />
        ) : (
          <Loader2 size={12} className="animate-spin" />
        )}
        {!compact && STEP_LABELS[step]}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white",
        "px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors",
        compact && "px-2 py-1",
        className
      )}
      title={t("offline.download")}
    >
      <Download size={12} />
      {!compact && t("offline.download")}
    </button>
  );
}
