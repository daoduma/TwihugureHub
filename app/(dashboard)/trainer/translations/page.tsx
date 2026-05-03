// app/(dashboard)/trainer/translations/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/lib/useTranslation";
import { CheckCircle, Wand2, AlertCircle, Loader2, Filter, Pencil, X, Check } from "lucide-react";

type Lang = "en" | "fr" | "rw";
type TStatus = "MANUAL" | "AI" | "PENDING";

interface TranslationItem {
  questionId: string;
  language: Lang;
  status: TStatus;
  sourceLang: Lang;
  originalStem: string;
  translatedStem: string;
  courseId: string;
  courseTitle: Record<string, string>;
  quizId: string;
}

function StatusIcon({ status }: { status: TStatus }) {
  if (status === "MANUAL") return <CheckCircle size={14} className="text-green-600" />;
  if (status === "AI") return <Wand2 size={14} className="text-yellow-600" />;
  return <AlertCircle size={14} className="text-red-400" />;
}

function StatusLabel({ status }: { status: TStatus }) {
  const labels = { MANUAL: "Approved", AI: "AI Generated", PENDING: "Pending" };
  const colors = {
    MANUAL: "bg-green-100 text-green-700",
    AI: "bg-yellow-100 text-yellow-700",
    PENDING: "bg-red-100 text-red-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      <StatusIcon status={status} />
      {labels[status]}
    </span>
  );
}


export default function TranslationsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en") as Lang;

  const [items, setItems] = useState<TranslationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLang, setFilterLang] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchItems = useCallback(() => {
    const params = new URLSearchParams();
    if (filterLang) params.set("language", filterLang);
    if (filterStatus) params.set("status", filterStatus);
    setLoading(true);
    fetch(`/api/trainer/translations?${params}`)
      .then((r) => r.json())
      .then((d) => d.success && setItems(d.data))
      .finally(() => setLoading(false));
  }, [filterLang, filterStatus]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAction = async (
    item: TranslationItem,
    action: "approve" | "edit_approve" | "reject",
    text?: string
  ) => {
    const key = `${item.questionId}-${item.language}`;
    setActionLoading(key);
    try {
      await fetch(`/api/trainer/questions/${item.questionId}/approve-translation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: item.language,
          action,
          editedText: text,
        }),
      });
      setEditingId(null);
      fetchItems();
    } finally {
      setActionLoading(null);
    }
  };

  const editKey = (item: TranslationItem) => `${item.questionId}-${item.language}`;
  const isLoading = (item: TranslationItem) => actionLoading === editKey(item);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("quiz.translationQueue" as never)}</h1>
        <p className="text-gray-500 mt-1">{t("quiz.translationQueueSubtitle" as never)}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <Filter size={15} className="text-gray-400" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t("quiz.filterLanguage" as never)}:</label>
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">{t("ui.all")}</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="rw">Ikinyarwanda</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t("ui.status")}:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">{t("ui.all")}</option>
            <option value="AI">AI Generated</option>
            <option value="MANUAL">Approved</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
        <span className="text-xs text-gray-400 ml-auto">{items.length} {t("quiz.items" as never)}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-green-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>{t("quiz.noTranslations" as never)}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => {
              const key = editKey(item);
              const isEditing = editingId === key;
              const courseTitle = item.courseTitle[lang] || item.courseTitle.en;

              return (
                <div key={key} className="p-4 space-y-3">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusLabel status={item.status} />
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                      {item.language.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400 truncate">{courseTitle}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">
                      {t("quiz.translatedFrom" as never)} {item.sourceLang.toUpperCase()}
                    </span>
                  </div>

                  {/* Content comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                        {t("quiz.original" as never)} ({item.sourceLang.toUpperCase()})
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 leading-relaxed">
                        {item.originalStem || <em className="text-gray-300">(empty)</em>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                        {t("quiz.translation" as never)} ({item.language.toUpperCase()})
                      </p>
                      {isEditing ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full text-sm border border-green-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 bg-blue-50/50 rounded p-2 leading-relaxed">
                          {item.translatedStem || <em className="text-gray-300">(no translation)</em>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {item.status !== "MANUAL" && (
                    <div className="flex items-center gap-2 pt-1">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => handleAction(item, "approve")}
                            disabled={isLoading(item)}
                            className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            {isLoading(item) ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            {t("quiz.approve" as never)}
                          </button>
                          <button
                            onClick={() => { setEditingId(key); setEditText(item.translatedStem); }}
                            className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50"
                          >
                            <Pencil size={11} />
                            {t("quiz.editApprove" as never)}
                          </button>
                          <button
                            onClick={() => handleAction(item, "reject")}
                            disabled={isLoading(item)}
                            className="inline-flex items-center gap-1.5 border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-xs hover:bg-red-50 disabled:opacity-50"
                          >
                            <X size={11} />
                            {t("quiz.reject" as never)}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAction(item, "edit_approve", editText)}
                            disabled={isLoading(item)}
                            className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            {isLoading(item) ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            {t("quiz.saveAndApprove" as never)}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50"
                          >
                            <X size={11} />
                            {t("ui.cancel")}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {item.status === "MANUAL" && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle size={11} />
                      {t("quiz.translationApproved" as never)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
