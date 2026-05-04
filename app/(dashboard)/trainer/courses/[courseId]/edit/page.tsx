// app/(dashboard)/trainer/courses/[courseId]/edit/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Loader2,
  Save, Send, Globe, X, ImageOff,
} from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { LangTabs } from "@/components/trainer/LangTabs";
import { RichTextEditor } from "@/components/trainer/RichTextEditor";
import { FileUpload } from "@/components/trainer/FileUpload";
import { StatusBadge } from "@/components/trainer/StatusBadge";
import type { Course, Module, Lesson, LessonAttachment } from "@/types";
import { VideoPlayer, isYouTubeUrl } from "@/components/ui/VideoPlayer";

type Lang = "en" | "fr" | "rw";
const LANGS: Lang[] = ["en", "fr", "rw"];
const EMPTY_ML = { en: "", fr: "", rw: "" };

// ─── Lesson Editor Panel ──────────────────────────────────────────────────────
function LessonEditor({
  lesson,
  onClose,
  onSaved,
}: {
  lesson: Lesson;
  onClose: () => void;
  onSaved: (updated: Lesson) => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<Lesson>(lesson);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Returns true on success, false on failure
  const save = useCallback(
    async (payload: Lesson): Promise<boolean> => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch("/api/trainer/lessons/" + payload.id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            body: payload.body,
            videoUrl: payload.videoUrl,
            audioUrl: payload.audioUrl,
            imageUrls: payload.imageUrls,
          }),
        });
        const json = await res.json();
        if (json.success) {
          onSaved(json.data);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          return true;
        } else {
          setSaveError(json.error ?? "Save failed. Please try again.");
          return false;
        }
      } catch {
        setSaveError("Network error. Please check your connection and try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [onSaved]
  );

  const update = (patch: Partial<Lesson>) => {
    const next = { ...data, ...patch };
    setData(next);
    setSaveError(null);
    // Auto-save debounce
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(next), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30">
      <div className="h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex flex-col sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold text-gray-800">{t("trainer.lessons.editor" as never)}</h2>
            <div className="flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin text-gray-400" />}
              {saved && <span className="text-xs text-green-600">{t("ui.success")}</span>}
              <button
                disabled={saving}
                onClick={async () => {
                  // Cancel any pending auto-save so we don't double-save
                  clearTimeout(debounceRef.current);
                  const ok = await save(data);
                  if (ok) onClose();
                }}
                className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={13} />
                {saving ? "Saving…" : t("ui.save")}
              </button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>
          </div>
          {saveError && (
            <div className="px-5 pb-3">
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠ {saveError}
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 flex-1">
          <LangTabs
            label={t("trainer.lessons.title" as never)}
            value={data.title as { en: string; fr: string; rw: string }}
            onChange={(v) => update({ title: v })}
          />

          <RichTextEditor
            label={t("trainer.lessons.body" as never)}
            value={data.body as { en: string; fr: string; rw: string }}
            onChange={(v) => update({ body: v })}
          />

          {/* Video URL + live preview */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t("trainer.lessons.videoUrl" as never)}
            </label>
            <div className="relative">
              <input
                type="url"
                value={data.videoUrl ?? ""}
                onChange={(e) => update({ videoUrl: e.target.value || undefined })}
                placeholder="https://youtube.com/watch?v=… or direct video URL"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-24 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {data.videoUrl && isYouTubeUrl(data.videoUrl) && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-red-600"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8zM9.75 15.5v-7l6.25 3.5-6.25 3.5z"/></svg>
                  YouTube
                </span>
              )}
            </div>
            {/* Live preview — renders as soon as a valid URL is entered */}
            {data.videoUrl && (
              <VideoPlayer
                url={data.videoUrl}
                title="Preview"
                className="mt-1"
              />
            )}
          </div>

          {/* Audio */}
          <FileUpload
            label={t("trainer.lessons.audio" as never)}
            type="audio"
            accept="audio/*"
            currentUrl={data.audioUrl}
            onUploaded={(url) => update({ audioUrl: url })}
            onRemove={() => update({ audioUrl: undefined })}
          />

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("trainer.lessons.images" as never)}
            </label>
            {(data.imageUrls ?? []).map((url, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-14 h-9 object-cover rounded border border-gray-100" />
                <span className="text-xs text-gray-500 flex-1 truncate">{url.startsWith("data:") ? "Uploaded image" : url.split("/").pop()}</span>
                <button
                  onClick={() => update({ imageUrls: (data.imageUrls ?? []).filter((_, j) => j !== i) })}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <FileUpload
              label={t("trainer.lessons.addImage" as never)}
              type="image"
              accept="image/*"
              multiple
              onUploaded={(url) => update({ imageUrls: [...(data.imageUrls ?? []), url] })}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("trainer.lessons.attachments" as never)}
            </label>
            {(data.attachments ?? []).map((att: LessonAttachment) => (
              <div key={att.id} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded p-2 mb-1">
                <span className="flex-1 truncate">{att.fileName}</span>
                <span className="text-gray-400">{att.fileType.split("/").pop()?.toUpperCase()}</span>
                <button
                  onClick={async () => {
                    await fetch(`/api/trainer/lessons/${data.id}/attachments?attachmentId=${att.id}`, { method: "DELETE" });
                    setData((prev) => ({
                      ...prev,
                      attachments: (prev.attachments ?? []).filter((a) => a.id !== att.id),
                    }));
                  }}
                  className="text-red-400 hover:text-red-600 ml-1"
                  title="Remove attachment"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <FileUpload
              label={t("trainer.lessons.addAttachment" as never)}
              type="attachment"
              accept=".pdf,.doc,.docx"
              onUploaded={async (url, fileName, fileType) => {
                // Persist via dedicated attachment API so it survives page reload
                const res = await fetch(`/api/trainer/lessons/${data.id}/attachments`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileUrl: url, fileName, fileType }),
                });
                const json = await res.json();
                if (json.success) {
                  setData((prev) => ({
                    ...prev,
                    attachments: [...(prev.attachments ?? []), json.data],
                  }));
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Module Row ───────────────────────────────────────────────────────────────
function ModuleRow({
  module,
  lang,
  courseId,
  onUpdate,
  onDelete,
  onAddLesson,
  onDeleteLesson,
  onSelectLesson,
  onNavigateToQuiz,
}: {
  module: Module;
  lang: Lang;
  courseId: string;
  onUpdate: (id: string, title: { en: string; fr: string; rw: string }) => void;
  onDelete: (id: string) => void;
  onAddLesson: (moduleId: string) => void;
  onDeleteLesson: (lessonId: string, moduleId: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
  onNavigateToQuiz: (lessonId: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(module.title as { en: string; fr: string; rw: string });

  const titleText = module.title[lang as keyof typeof module.title] || module.title.en || t("trainer.modules.untitled" as never);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Module header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <GripVertical size={14} className="text-gray-300 cursor-grab" />
        <button onClick={() => setExpanded((v) => !v)} className="p-0.5 text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1">
              <LangTabs value={titleDraft} onChange={setTitleDraft} />
            </div>
            <button
              onClick={() => { onUpdate(module.id, titleDraft); setEditing(false); }}
              className="text-xs bg-green-600 text-white px-2 py-1 rounded"
            >
              {t("ui.save")}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 px-2 py-1">
              {t("ui.cancel")}
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm font-medium text-gray-800">{titleText}</span>
            <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100">
              {t("ui.edit")}
            </button>
            <button onClick={() => onDelete(module.id)} className="text-red-400 hover:text-red-600 p-0.5 rounded">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>

      {/* Lessons */}
      {expanded && (
        <div className="divide-y divide-gray-50">
          {(module.lessons ?? []).map((lesson) => {
            const lessonTitle = lesson.title[lang as keyof typeof lesson.title] || lesson.title.en || t("trainer.lessons.untitled" as never);
            return (
              <div key={lesson.id} className="flex items-center gap-2 px-6 py-2.5 hover:bg-gray-50 group">
                <GripVertical size={12} className="text-gray-200 cursor-grab" />
                <button
                  onClick={() => onSelectLesson(lesson)}
                  className="flex-1 text-sm text-left text-gray-700 hover:text-green-700"
                >
                  {lessonTitle}
                </button>
                <button
                  onClick={() => onNavigateToQuiz(lesson.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded hover:bg-blue-50 border border-transparent hover:border-blue-200"
                  title="Edit quiz for this lesson"
                >
                  Quiz
                </button>
                <button
                  onClick={() => onDeleteLesson(lesson.id, module.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5 rounded"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <div className="px-6 py-2">
            <button
              onClick={() => onAddLesson(module.id)}
              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <Plus size={12} />
              {t("trainer.lessons.add" as never)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Edit Page ───────────────────────────────────────────────────────────
export default function CourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en") as Lang;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Metadata fields
  const [title, setTitle] = useState(EMPTY_ML);
  const [description, setDescription] = useState(EMPTY_ML);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [availableLangs, setAvailableLangs] = useState<string[]>([]);

  const fetchCourse = useCallback(() => {
    fetch("/api/trainer/courses/" + courseId)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const c: Course = d.data;
          setCourse(c);
          setTitle(c.title as { en: string; fr: string; rw: string });
          setDescription(c.description as { en: string; fr: string; rw: string });
          setThumbnailUrl(c.thumbnailUrl ?? null);
          setAvailableLangs(c.availableLanguages ?? []);
          setModules((c.modules ?? []) as Module[]);
        }
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const saveMetadata = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/trainer/courses/" + courseId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, thumbnailUrl, availableLanguages: availableLangs }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const addModule = async () => {
    const res = await fetch("/api/trainer/courses/" + courseId + "/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: { en: "New Module", fr: "Nouveau module", rw: "Igice gishya" } }),
    });
    const json = await res.json();
    if (json.success) setModules((prev) => [...prev, { ...json.data, lessons: [] }]);
  };

  const updateModule = async (id: string, moduleTitle: { en: string; fr: string; rw: string }) => {
    await fetch("/api/trainer/modules/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: moduleTitle }),
    });
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title: moduleTitle } : m)));
  };

  const deleteModule = async (id: string) => {
    if (!confirm(t("trainer.modules.confirmDelete" as never))) return;
    await fetch("/api/trainer/modules/" + id, { method: "DELETE" });
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const addLesson = async (moduleId: string) => {
    const res = await fetch("/api/trainer/modules/" + moduleId + "/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: { en: "New Lesson", fr: "Nouvelle leçon", rw: "Isomo rishya" } }),
    });
    const json = await res.json();
    if (json.success) {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, lessons: [...(m.lessons ?? []), json.data] } : m
        )
      );
    }
  };

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!confirm(t("trainer.lessons.confirmDelete" as never))) return;
    await fetch("/api/trainer/lessons/" + lessonId, { method: "DELETE" });
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: (m.lessons ?? []).filter((l) => l.id !== lessonId) } : m
      )
    );
  };

  const handleLessonSaved = (updated: Lesson) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: (m.lessons ?? []).map((l) => (l.id === updated.id ? updated : l)),
      }))
    );
    setSelectedLesson(updated);
  };

  const navigateToQuiz = (lessonId: string) => {
    router.push(`/trainer/courses/${courseId}/lessons/${lessonId}/quiz`);
  };

  const handleSubmitForApproval = async () => {
    if (submitting) return;
    if (!confirm(t("trainer.courses.confirmSubmit" as never))) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trainer/courses/" + courseId + "/submit", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setCourse((prev) => prev ? { ...prev, status: "PENDING_APPROVAL" } : prev);
      } else {
        alert(json.error ?? "Failed to submit for approval");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLang = (l: string) => {
    setAvailableLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-green-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 text-center text-gray-500">
        {t("errors.notFound")}
        <button onClick={() => router.back()} className="block mx-auto mt-3 text-green-600 text-sm">
          ← {t("ui.back")}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/trainer/courses")} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            ← {t("ui.back")}
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {(title as Record<string, string>)[lang] || t("trainer.courses.untitled" as never)}
          </h1>
          <StatusBadge status={course.status} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveMetadata}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm transition-colors ${
              saveStatus === "saved"
                ? "border-green-300 text-green-700 bg-green-50"
                : saveStatus === "error"
                ? "border-red-300 text-red-600 bg-red-50"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Save failed" : t("ui.save")}
          </button>
          {course.status === "DRAFT" && (
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {t("trainer.courses.submitApproval" as never)}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Metadata */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              {t("trainer.courses.metadata" as never)}
            </h2>

            {/* Thumbnail */}
            <div>
              {thumbnailUrl ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-100 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setThumbnailUrl(null)}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-full h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
                  <ImageOff size={20} className="text-gray-300" />
                </div>
              )}
              <FileUpload
                label={t("trainer.courses.thumbnail" as never)}
                type="thumbnail"
                accept="image/*"
                onUploaded={(url) => setThumbnailUrl(url)}
              />
            </div>

            <LangTabs
              label={t("trainer.courses.titleLabel" as never)}
              value={title}
              onChange={setTitle}
            />

            <LangTabs
              label={t("trainer.courses.descriptionLabel" as never)}
              value={description}
              onChange={setDescription}
              multiline
              rows={4}
            />

            {/* Language availability toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Globe size={14} className="text-gray-400" />
                {t("trainer.courses.languageAvailability" as never)}
              </label>
              <div className="flex gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLang(l)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      availableLangs.includes(l)
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Modules & Lessons */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                {t("trainer.modules.title" as never)}
              </h2>
              <button
                onClick={addModule}
                className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} />
                {t("trainer.modules.add" as never)}
              </button>
            </div>

            {modules.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">{t("trainer.modules.empty" as never)}</p>
                <p className="text-xs mt-1">{t("trainer.modules.emptyHint" as never)}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((mod) => (
                  <ModuleRow
                    key={mod.id}
                    module={mod}
                    lang={lang}
                    courseId={courseId}
                    onUpdate={updateModule}
                    onDelete={deleteModule}
                    onAddLesson={addLesson}
                    onDeleteLesson={deleteLesson}
                    onSelectLesson={setSelectedLesson}
                    onNavigateToQuiz={navigateToQuiz}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Editor Panel */}
      {selectedLesson && (
        <LessonEditor
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onSaved={handleLessonSaved}
        />
      )}
    </div>
  );
}
