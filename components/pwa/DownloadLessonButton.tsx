// components/pwa/DownloadLessonButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Download, Check, Loader2, Trash2, WifiOff } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import {
  saveLesson,
  deleteLesson,
  isLessonDownloaded,
  type OfflineLesson,
} from "@/lib/offlineStorage";
import { cn } from "@/lib/utils";

interface DownloadLessonButtonProps {
  lesson:     OfflineLesson;
  className?: string;
  compact?:   boolean;
}

export function DownloadLessonButton({
  lesson,
  className,
  compact = false,
}: DownloadLessonButtonProps) {
  const { t }    = useTranslation();
  const isOnline = useOnlineStatus();

  const [downloaded, setDownloaded] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(false);

  useEffect(() => {
    isLessonDownloaded(lesson.id)
      .then(setDownloaded)
      .catch(() => setDownloaded(false));
  }, [lesson.id]);

  async function handleDownload() {
    if (!isOnline) return; // shouldn't happen — button is hidden offline — but guard anyway
    setLoading(true);
    setError(false);
    try {
      await saveLesson({ ...lesson, savedAt: new Date().toISOString() });
      setDownloaded(true);
    } catch (e) {
      console.error("Failed to save lesson offline:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await deleteLesson(lesson.id);
      setDownloaded(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Downloaded state
  if (downloaded) {
    return (
      <button
        onClick={handleRemove}
        disabled={loading}
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
        {loading ? (
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

  // Error state
  if (error) {
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
        <Download size={12} />
        {!compact && (t("offline.retryDownload" as never) || "Retry")}
      </button>
    );
  }

  // Not downloaded + offline — don't show the button at all
  if (!isOnline) return null;

  // Normal download button
  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white",
        "px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors",
        "disabled:opacity-50",
        compact && "px-2 py-1",
        className
      )}
      title={t("offline.download")}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Download size={12} />
      )}
      {!compact && (loading
        ? (t("offline.downloading" as never) || "Saving…")
        : t("offline.download"))}
    </button>
  );
}
