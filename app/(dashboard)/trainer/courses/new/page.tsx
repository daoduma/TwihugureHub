// app/(dashboard)/trainer/courses/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/useTranslation";
import { LangTabs } from "@/components/trainer/LangTabs";
import { FileUpload } from "@/components/trainer/FileUpload";
import { Loader2 } from "lucide-react";

const EMPTY_ML = { en: "", fr: "", rw: "" };

export default function NewCoursePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [title, setTitle] = useState(EMPTY_ML);
  const [description, setDescription] = useState(EMPTY_ML);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.en && !title.fr && !title.rw) {
      setError(t("trainer.courses.titleRequired" as never));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, thumbnailUrl }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push("/trainer/courses/" + json.data.id + "/edit");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create course");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("trainer.courses.createNew" as never)}</h1>
        <p className="text-gray-500 mt-1">{t("trainer.courses.createSubtitle" as never)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
        <LangTabs
          label={t("trainer.courses.titleLabel" as never)}
          value={title}
          onChange={setTitle}
          placeholder={{ en: "Course title in English", fr: "Titre du cours en français", rw: "Izina ry'isomo mu Kinyarwanda" }}
        />

        <LangTabs
          label={t("trainer.courses.descriptionLabel" as never)}
          value={description}
          onChange={setDescription}
          multiline
          rows={5}
          placeholder={{ en: "Describe this course…", fr: "Décrivez ce cours…", rw: "Sobanura isomo…" }}
        />

        <FileUpload
          label={t("trainer.courses.thumbnail" as never)}
          type="thumbnail"
          accept="image/*"
          currentUrl={thumbnailUrl}
          onUploaded={(url) => setThumbnailUrl(url)}
          onRemove={() => setThumbnailUrl(null)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            {t("ui.cancel")}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {t("trainer.courses.createAndEdit" as never)}
          </button>
        </div>
      </div>
    </div>
  );
}
