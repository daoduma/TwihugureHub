// app/(dashboard)/trainer/courses/[courseId]/lessons/[lessonId]/quiz/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  Loader2, Save, Wand2, CheckCircle, Clock, AlertCircle,
} from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { LangTabs } from "@/components/trainer/LangTabs";

type Lang = "en" | "fr" | "rw";
type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
type TStatus = "MANUAL" | "AI" | "PENDING";

type MLText = { en: string; fr: string; rw: string };

interface TranslationStatus { en: TStatus; fr: TStatus; rw: TStatus }

interface AnswerOption {
  id: string;
  text: MLText;
  isCorrect: boolean;
  order: number;
}

interface QuestionFeedback {
  correctFeedback: MLText;
  incorrectFeedback: MLText;
}

interface Question {
  id: string;
  quizId: string;
  type: QuestionType;
  stem: MLText;
  order: number;
  translationStatus: TranslationStatus;
  options: AnswerOption[];
  feedback?: QuestionFeedback;
  aiGrading?: boolean;
  desiredResponse?: MLText;
}

interface Quiz {
  id: string;
  lessonId: string;
  title: MLText;
  passingScore: number;
  allowRetry: boolean;
  questions: Question[];
}

const EMPTY_ML: MLText = { en: "", fr: "", rw: "" };

// ─── Translation status badge ─────────────────────────────────────────────────
function TStatusBadge({ status }: { status: TStatus }) {
  if (status === "MANUAL") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
      <CheckCircle size={9} /> Manual
    </span>
  );
  if (status === "AI") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">
      <Wand2 size={9} /> AI
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-500">
      <AlertCircle size={9} /> Pending
    </span>
  );
}

// ─── Question Type Badge ──────────────────────────────────────────────────────
function TypeBadge({ type }: { type: QuestionType }) {
  const labels: Record<QuestionType, string> = {
    MULTIPLE_CHOICE: "MC",
    TRUE_FALSE: "T/F",
    SHORT_ANSWER: "SA",
  };
  const colors: Record<QuestionType, string> = {
    MULTIPLE_CHOICE: "bg-blue-100 text-blue-700",
    TRUE_FALSE: "bg-purple-100 text-purple-700",
    SHORT_ANSWER: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

// ─── Answer Options Editor ────────────────────────────────────────────────────
function OptionsEditor({
  question,
  onChange,
  onAiGradingChange,
  onDesiredResponseChange,
}: {
  question: Question;
  onChange: (options: AnswerOption[]) => void;
  onAiGradingChange?: (val: boolean) => void;
  onDesiredResponseChange?: (val: MLText) => void;
}) {
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<Lang>("en");

  if (question.type === "SHORT_ANSWER") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 italic">{t("quiz.shortAnswerNote" as never)}</p>

        {/* Desired Response */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("trainer.grading.desiredResponseLabel" as never)}
            <span className="ml-1 text-gray-400 font-normal">({t("trainer.grading.desiredResponseNote" as never)})</span>
          </label>
          <LangTabs
            value={question.desiredResponse ?? EMPTY_ML}
            onChange={(v) => onDesiredResponseChange?.(v)}
            placeholder={{ en: "Enter the expected answer...", fr: "Entrez la réponse attendue...", rw: "Injiza igisubizo gitegerejwe..." }}
            multiline
            rows={3}
          />
        </div>

        {/* AI Grading Toggle */}
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <Wand2 size={13} className="text-yellow-600" />
              {t("trainer.grading.aiGradingLabel" as never)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("trainer.grading.aiGradingDesc" as never)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAiGradingChange?.(!question.aiGrading)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              question.aiGrading ? "bg-yellow-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${
                question.aiGrading ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    );
  }

  if (question.type === "TRUE_FALSE") {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600 mb-1">{t("quiz.correctAnswer" as never)}</p>
        {question.options.map((opt, i) => {
          const label = opt.text.en || (i === 0 ? "True" : "False");
          return (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`tf-${question.id}`}
                checked={opt.isCorrect}
                onChange={() => {
                  const updated = question.options.map((o, j) => ({ ...o, isCorrect: j === i }));
                  onChange(updated);
                }}
                className="text-green-600"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  // Multiple choice
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-600 flex-1">{t("quiz.answerOptions" as never)}</span>
        <div className="flex gap-1">
          {(["en", "fr", "rw"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setActiveLang(l)}
              className={`px-2 py-0.5 text-[10px] rounded ${activeLang === l ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {question.options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          <input
            type="radio"
            name={`mc-${question.id}`}
            checked={opt.isCorrect}
            onChange={() => {
              const updated = question.options.map((o, j) => ({ ...o, isCorrect: j === i }));
              onChange(updated);
            }}
            className="text-green-600 flex-shrink-0"
            title="Mark as correct"
          />
          <input
            type="text"
            value={opt.text[activeLang]}
            onChange={(e) => {
              const updated: AnswerOption[] = question.options.map((o, j) =>
                j === i
                  ? { ...o, text: { ...o.text, [activeLang]: e.target.value } as MLText }
                  : o
              );
              onChange(updated);
            }}
            placeholder={`Option ${i + 1} (${activeLang.toUpperCase()})`}
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          {question.options.length > 2 && (
            <button
              type="button"
              onClick={() => onChange(question.options.filter((_, j) => j !== i))}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}

      {question.options.length < 6 && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...question.options,
              { id: `new-${Date.now()}`, text: EMPTY_ML, isCorrect: false, order: question.options.length },
            ])
          }
          className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 mt-1"
        >
          <Plus size={11} /> {t("quiz.addOption" as never)}
        </button>
      )}
    </div>
  );
}

// ─── Question Editor ──────────────────────────────────────────────────────────
function QuestionEditor({
  question,
  onSave,
  onDelete,
  onTranslate,
  translating,
}: {
  question: Question;
  onSave: (q: Question) => void;
  onDelete: (id: string) => void;
  onTranslate: (id: string, lang: Lang) => void;
  translating: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Question>(question);
  const [expanded, setExpanded] = useState(false);

  const stemPreview = draft.stem.en || draft.stem.fr || draft.stem.rw || t("quiz.untitledQuestion" as never);

  const handleOptionChange = (options: AnswerOption[]) => {
    setDraft((prev) => ({ ...prev, options }));
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
        <GripVertical size={14} className="text-gray-300 cursor-grab flex-shrink-0" />
        <button onClick={() => setExpanded((v) => !v)} className="p-0.5 text-gray-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="text-xs text-gray-400 w-5 flex-shrink-0">Q{draft.order + 1}</span>
        <TypeBadge type={draft.type} />
        <span className="flex-1 text-sm text-gray-800 truncate">{stemPreview}</span>

        {/* Translation status indicators */}
        <div className="hidden sm:flex items-center gap-1">
          {(["en", "fr", "rw"] as Lang[]).map((l) => (
            <div key={l} className="flex items-center gap-0.5">
              <span className="text-[9px] text-gray-400 uppercase">{l}</span>
              <TStatusBadge status={draft.translationStatus[l] ?? "PENDING"} />
            </div>
          ))}
        </div>

        <button
          onClick={() => onDelete(draft.id)}
          className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="p-4 space-y-5 border-t border-gray-100 bg-white">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("quiz.questionType" as never)}</label>
            <div className="flex gap-2">
              {(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"] as QuestionType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, type: tp }))}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    draft.type === tp
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-200 text-gray-600 hover:border-green-400"
                  }`}
                >
                  {tp.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Stem with lang tabs + translation status */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">{t("quiz.questionStem" as never)}</label>
              <div className="flex gap-1">
                {(["fr", "rw"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => onTranslate(draft.id, l)}
                    disabled={translating || !!(draft.translationStatus[l] === "MANUAL")}
                    className="text-[10px] flex items-center gap-0.5 px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 disabled:opacity-40"
                    title={`AI translate to ${l.toUpperCase()}`}
                  >
                    {translating ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <LangTabs
              value={draft.stem}
              onChange={(v) => setDraft((prev) => ({ ...prev, stem: v }))}
            />
            <div className="flex gap-3 mt-1">
              {(["en", "fr", "rw"] as Lang[]).map((l) => (
                <div key={l} className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-400">{l.toUpperCase()}:</span>
                  <TStatusBadge status={draft.translationStatus[l] ?? "PENDING"} />
                </div>
              ))}
            </div>
          </div>

          {/* Answer options */}
          <OptionsEditor
            question={draft}
            onChange={handleOptionChange}
            onAiGradingChange={(val) => setDraft((prev) => ({ ...prev, aiGrading: val }))}
            onDesiredResponseChange={(val) => setDraft((prev) => ({ ...prev, desiredResponse: val }))}
          />

          {/* Feedback */}
          <div className="space-y-3">
            <LangTabs
              label={t("quiz.correctFeedback" as never)}
              value={draft.feedback?.correctFeedback ?? EMPTY_ML}
              onChange={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  feedback: { ...prev.feedback, correctFeedback: v, incorrectFeedback: prev.feedback?.incorrectFeedback ?? EMPTY_ML },
                }))
              }
            />
            <LangTabs
              label={t("quiz.incorrectFeedback" as never)}
              value={draft.feedback?.incorrectFeedback ?? EMPTY_ML}
              onChange={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  feedback: { ...prev.feedback, incorrectFeedback: v, correctFeedback: prev.feedback?.correctFeedback ?? EMPTY_ML },
                }))
              }
            />
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={() => onSave(draft)}
              className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700"
            >
              <Save size={13} />
              {t("ui.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Quiz Designer Page ──────────────────────────────────────────────────
export default function QuizDesignerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateAllLang, setTranslateAllLang] = useState<Lang>("rw");
  const [translateAllProgress, setTranslateAllProgress] = useState<{
    done: number; total: number; active: boolean;
  }>({ done: 0, total: 0, active: false });

  const fetchQuiz = useCallback(() => {
    setFetchError(null);
    fetch(`/api/trainer/lessons/${lessonId}/quiz`)
      .then(async (r) => {
        const d = await r.json();
        if (d.success) {
          // data is the quiz object, or null if none exists yet — both are valid
          setQuiz(d.data ?? null);
        } else {
          // Real API error (auth failure, lesson not found, etc.)
          setFetchError(d.error ?? "Failed to load quiz. Please refresh.");
        }
      })
      .catch(() => setFetchError("Network error. Please check your connection."))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const createQuiz = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/trainer/lessons/${lessonId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: { en: "Lesson Quiz", fr: "Quiz de la leçon", rw: "Ikizamini cy'isomo" } }),
      });
      const json = await res.json();

      if (json.success) {
        setQuiz(json.data);
      } else if (res.status === 409) {
        // Quiz was already created (e.g. a previous request succeeded but the
        // UI didn't update).  Just fetch and display the existing one.
        fetchQuiz();
      } else {
        setCreateError(json.error ?? "Could not create quiz. Please try again.");
      }
    } catch {
      setCreateError("Network error. Please check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  const saveSettings = async () => {
    if (!quiz) return;
    setSavingSettings(true);
    await fetch(`/api/trainer/quiz/${quiz.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: quiz.title, passingScore: quiz.passingScore, allowRetry: quiz.allowRetry }),
    });
    setSavingSettings(false);
  };

  const addQuestion = async (type: QuestionType = "MULTIPLE_CHOICE") => {
    if (!quiz) return;
    setAddingQuestion(true);
    const res = await fetch(`/api/trainer/quiz/${quiz.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const json = await res.json();
    if (json.success) {
      setQuiz((prev) => prev ? { ...prev, questions: [...prev.questions, json.data] } : prev);
    }
    setAddingQuestion(false);
  };

  const saveQuestion = async (q: Question) => {
    const res = await fetch(`/api/trainer/questions/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stem: q.stem,
        type: q.type,
        translationStatus: q.translationStatus,
        options: q.options,
        feedback: q.feedback,
        aiGrading: q.aiGrading ?? false,
        desiredResponse: q.desiredResponse ?? EMPTY_ML,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setQuiz((prev) =>
        prev
          ? { ...prev, questions: prev.questions.map((q2) => (q2.id === q.id ? json.data : q2)) }
          : prev
      );
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm(t("quiz.confirmDeleteQuestion" as never))) return;
    await fetch(`/api/trainer/questions/${id}`, { method: "DELETE" });
    setQuiz((prev) =>
      prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== id) } : prev
    );
  };

  const translateQuestion = async (questionId: string, lang: Lang) => {
    setTranslatingId(questionId);
    const res = await fetch(`/api/trainer/questions/${questionId}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLanguage: lang }),
    });
    const json = await res.json();
    if (json.success) {
      setQuiz((prev) =>
        prev
          ? { ...prev, questions: prev.questions.map((q) => (q.id === questionId ? json.data : q)) }
          : prev
      );
    }
    setTranslatingId(null);
  };

  const translateAll = async () => {
    if (!quiz) return;
    setTranslateAllProgress({ done: 0, total: quiz.questions.length, active: true });

    const res = await fetch(`/api/trainer/quiz/${quiz.id}/translate-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLanguage: translateAllLang }),
    });

    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "done" || event.type === "skip") {
            setTranslateAllProgress((p) => ({ ...p, done: p.done + 1 }));
          }
          if (event.type === "complete") {
            setTranslateAllProgress((p) => ({ ...p, active: false }));
            fetchQuiz();
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-green-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
        <button
          onClick={() => router.push(`/trainer/courses/${courseId}/edit`)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← {t("ui.back")}
        </button>

        {fetchError ? (
          /* ── API / network error when loading ── */
          <div className="bg-white rounded-xl border border-red-100 shadow-sm p-12">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Could not load quiz</h1>
            <p className="text-red-500 text-sm mb-6">{fetchError}</p>
            <button
              onClick={() => { setLoading(true); fetchQuiz(); }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        ) : (
          /* ── No quiz exists yet ── */
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12">
            <h1 className="text-xl font-bold text-gray-800 mb-2">{t("quiz.noQuizYet" as never)}</h1>
            <p className="text-gray-500 text-sm mb-6">{t("quiz.noQuizHint" as never)}</p>

            {createError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2 mb-4">
                ⚠ {createError}
              </p>
            )}

            <button
              onClick={createQuiz}
              disabled={creating}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              {creating ? "Creating…" : t("quiz.createQuiz" as never)}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/trainer/courses/${courseId}/edit`)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ← {t("ui.back")}
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t("quiz.designer" as never)}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              {t("quiz.settings" as never)}
            </h2>

            <LangTabs
              label={t("quiz.quizTitle" as never)}
              value={quiz.title}
              onChange={(v) => setQuiz((prev) => prev ? { ...prev, title: v } : prev)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("quiz.passingScore" as never)} (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={quiz.passingScore}
                onChange={(e) => setQuiz((prev) => prev ? { ...prev, passingScore: Number(e.target.value) } : prev)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t("quiz.allowRetry" as never)}</label>
              <button
                type="button"
                onClick={() => setQuiz((prev) => prev ? { ...prev, allowRetry: !prev.allowRetry } : prev)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  quiz.allowRetry ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${
                    quiz.allowRetry ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {savingSettings ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {t("quiz.saveSettings" as never)}
            </button>
          </div>

          {/* Translate All panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Wand2 size={14} className="text-yellow-600" />
              {t("quiz.aiTranslate" as never)}
            </h2>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">{t("quiz.targetLanguage" as never)}</label>
              <select
                value={translateAllLang}
                onChange={(e) => setTranslateAllLang(e.target.value as Lang)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="rw">Ikinyarwanda</option>
              </select>
            </div>

            {translateAllProgress.active && (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span><Clock size={10} className="inline mr-1" />{t("quiz.translating" as never)}</span>
                  <span>{translateAllProgress.done}/{translateAllProgress.total}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${(translateAllProgress.done / Math.max(translateAllProgress.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={translateAll}
              disabled={translateAllProgress.active || quiz.questions.length === 0}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50"
            >
              <Wand2 size={13} />
              {t("quiz.translateAll" as never)}
            </button>

            <p className="text-[10px] text-gray-400">{t("quiz.translateAllHint" as never)}</p>
          </div>
        </div>

        {/* Questions panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                {t("quiz.questions" as never)} ({quiz.questions.length})
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={newQuestionType}
                  onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
                <button
                  onClick={() => addQuestion(newQuestionType)}
                  disabled={addingQuestion}
                  className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                >
                  {addingQuestion ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  {t("quiz.addQuestion" as never)}
                </button>
              </div>
            </div>

            {quiz.questions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">{t("quiz.noQuestions" as never)}</p>
                <p className="text-xs mt-1">{t("quiz.noQuestionsHint" as never)}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quiz.questions.map((q) => (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    onSave={saveQuestion}
                    onDelete={deleteQuestion}
                    onTranslate={translateQuestion}
                    translating={translatingId === q.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
