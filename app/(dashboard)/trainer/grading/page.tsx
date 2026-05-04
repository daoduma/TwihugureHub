// app/(dashboard)/trainer/grading/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Wand2,
  MessageSquare,
  Flag,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

type GradingStatus = "PENDING" | "AI_GRADED" | "MANUALLY_GRADED";
type FlagStatus = "OPEN" | "REVIEWED" | "RESOLVED";

interface ShortAnswerItem {
  id: string;
  shortAnswerText: string | null;
  isCorrect: boolean;
  gradingStatus: GradingStatus;
  manualScore: number | null;
  trainerFeedback: string | null;
  attempt: {
    id: string;
    score: number;
    passed: boolean;
    languageUsed: string;
    farmer: { id: string; name: string; email: string };
    quiz: {
      id: string;
      title: Record<string, string>;
      passingScore: number;
      lesson: {
        title: Record<string, string>;
        module: {
          course: { id: string; title: Record<string, string> };
        };
      };
    };
  };
  question: {
    id: string;
    stem: Record<string, string>;
    desiredResponse: Record<string, string> | null;
    aiGrading: boolean;
  };
  flags: Array<{ id: string; reason: string; createdAt: string }>;
}

interface FlagItem {
  id: string;
  reason: string;
  status: FlagStatus;
  resolution: string | null;
  createdAt: string;
  farmer: { id: string; name: string; email: string };
  answer: {
    id: string;
    shortAnswerText: string | null;
    manualScore: number | null;
    question: { stem: Record<string, string>; desiredResponse: Record<string, string> | null };
    attempt: {
      quiz: {
        title: Record<string, string>;
        lesson: { title: Record<string, string>; module: { course: { id: string; title: Record<string, string> } } };
      };
    };
  };
}

function getText(obj: Record<string, string> | null | undefined): string {
  if (!obj) return "";
  return obj.en || obj.fr || obj.rw || "";
}

function GradingStatusBadge({ status }: { status: GradingStatus }) {
  if (status === "MANUALLY_GRADED")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle size={10} /> Graded
      </span>
    );
  if (status === "AI_GRADED")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Wand2 size={10} /> AI Graded
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-500">
      <AlertTriangle size={10} /> Pending
    </span>
  );
}

function GradeCard({
  item,
  onGraded,
}: {
  item: ShortAnswerItem;
  onGraded: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [score, setScore] = useState<number>(item.manualScore ?? 0);
  const [feedback, setFeedback] = useState(item.trainerFeedback ?? "");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [localItem, setLocalItem] = useState(item);

  const handleManualGrade = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/trainer/grading/short-answers/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualScore: score,
          trainerFeedback: feedback,
          isCorrect: score >= 50,
        }),
      });
      if (res.ok) {
        setLocalItem((prev) => ({
          ...prev,
          gradingStatus: "MANUALLY_GRADED",
          manualScore: score,
          trainerFeedback: feedback,
          isCorrect: score >= 50,
        }));
        onGraded();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAiGrade = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/trainer/grading/short-answers/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.aiScore ?? 0);
        setFeedback(data.aiFeedback ?? "");
        setLocalItem((prev) => ({
          ...prev,
          gradingStatus: "AI_GRADED",
          manualScore: data.aiScore,
          trainerFeedback: data.aiFeedback,
          isCorrect: data.aiIsCorrect,
        }));
        onGraded();
      }
    } finally {
      setAiLoading(false);
    }
  };

  const hasOpenFlag = localItem.flags.length > 0;

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        hasOpenFlag
          ? "border-amber-300 bg-amber-50"
          : localItem.gradingStatus === "PENDING"
          ? "border-red-200"
          : "border-gray-200"
      }`}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <button className="text-gray-400">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {getText(localItem.question.stem)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {localItem.attempt.farmer.name} ·{" "}
            {getText(localItem.attempt.quiz.lesson.module.course.title)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasOpenFlag && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-200 text-amber-800 font-medium">
              <Flag size={10} /> Disputed
            </span>
          )}
          <GradingStatusBadge status={localItem.gradingStatus} />
          {localItem.gradingStatus !== "PENDING" && (
            <span className="text-sm font-bold text-gray-700">
              {localItem.manualScore ?? 0}/100
            </span>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
          {/* Farmer's answer */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Farmer's Answer
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 leading-relaxed">
              {localItem.shortAnswerText || (
                <span className="italic text-gray-400">No answer provided</span>
              )}
            </div>
          </div>

          {/* Desired response */}
          {localItem.question.desiredResponse && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Expected / Model Answer
              </p>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                {getText(localItem.question.desiredResponse)}
              </div>
            </div>
          )}

          {/* Open flags */}
          {hasOpenFlag && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <Flag size={11} /> Farmer Dispute
              </p>
              {localItem.flags.map((f) => (
                <p key={f.id} className="text-sm text-amber-800">
                  {f.reason}
                </p>
              ))}
            </div>
          )}

          {/* Grading form */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Score (0–100)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="flex-1 accent-green-600"
                />
                <span
                  className={`text-lg font-bold w-12 text-center ${
                    score >= 50 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {score}
                </span>
                {score >= 50 ? (
                  <CheckCircle size={18} className="text-green-500" />
                ) : (
                  <XCircle size={18} className="text-red-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ≥50 = Correct · &lt;50 = Incorrect
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Feedback to Farmer (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                placeholder=t("trainer.grading.feedbackPlaceholder")
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              {localItem.question.aiGrading && (
                <button
                  onClick={handleAiGrade}
                  disabled={aiLoading || saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Wand2 size={13} />
                  )}
                  AI Grade
                </button>
              )}
              <button
                onClick={handleManualGrade}
                disabled={saving || aiLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle size={13} />
                )}
                Save Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FlagCard({
  flag,
  onResolved,
}: {
  flag: FlagItem;
  onResolved: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [resolution, setResolution] = useState(flag.resolution ?? "");
  const [newScore, setNewScore] = useState<number>(flag.answer.manualScore ?? 0);
  const [adjustScore, setAdjustScore] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleResolve = async (status: "REVIEWED" | "RESOLVED") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/trainer/short-answer-flags/${flag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          status,
          ...(adjustScore ? { newScore } : {}),
        }),
      });
      if (res.ok) onResolved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Flag size={14} className="text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {getText(flag.answer.question.stem)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {flag.farmer.name} · {new Date(flag.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium shrink-0">
          {flag.status}
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronRight size={14} className="text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-amber-200 p-5 space-y-4 bg-white">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Farmer's Dispute Reason
            </p>
            <p className="text-sm text-gray-800 bg-amber-50 rounded-lg p-3">
              {flag.reason}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Farmer's Answer
            </p>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
              {flag.answer.shortAnswerText || (
                <span className="italic text-gray-400">No answer</span>
              )}
            </p>
          </div>

          {flag.answer.question.desiredResponse && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Expected Answer
              </p>
              <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3">
                {getText(flag.answer.question.desiredResponse)}
              </p>
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adjustScore}
                onChange={(e) => setAdjustScore(e.target.checked)}
                className="rounded text-green-600"
              />
              <span className="text-sm text-gray-700">Adjust the score</span>
            </label>

            {adjustScore && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  New Score (0–100)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={newScore}
                    onChange={(e) => setNewScore(Number(e.target.value))}
                    className="flex-1 accent-green-600"
                  />
                  <span
                    className={`text-lg font-bold w-12 text-center ${
                      newScore >= 50 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {newScore}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Resolution Note
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={2}
                placeholder=t("trainer.grading.resolutionPlaceholder")
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleResolve("REVIEWED")}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Mark Reviewed
              </button>
              <button
                onClick={() => handleResolve("RESOLVED")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle size={13} />
                )}
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GradingPage() {
  const [tab, setTab] = useState<"grading" | "flags">("grading");
  const [gradingFilter, setGradingFilter] = useState<"PENDING" | "AI_GRADED" | "ALL">("PENDING");
  const [answers, setAnswers] = useState<ShortAnswerItem[]>([]);
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [loadingFlags, setLoadingFlags] = useState(false);

  const fetchAnswers = useCallback(async () => {
    setLoadingAnswers(true);
    try {
      const filterVal =
        gradingFilter === "PENDING"
          ? "PENDING"
          : gradingFilter === "AI_GRADED"
          ? "AI_GRADED"
          : "ALL";
      const res = await fetch(
        `/api/trainer/grading/short-answers?status=${filterVal}`
      );
      const data = await res.json();
      if (data.success) setAnswers(data.data);
    } finally {
      setLoadingAnswers(false);
    }
  }, [gradingFilter]);

  const fetchFlags = useCallback(async () => {
    setLoadingFlags(true);
    try {
      const res = await fetch("/api/trainer/short-answer-flags?status=OPEN");
      const data = await res.json();
      if (data.success) setFlags(data.data);
    } finally {
      setLoadingFlags(false);
    }
  }, []);

  useEffect(() => {
    fetchAnswers();
  }, [fetchAnswers]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const pendingCount = answers.filter((a) => a.gradingStatus === "PENDING").length;
  const openFlagsCount = flags.length;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={22} className="text-green-600" />
            Short Answer Grading
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and grade farmer short answer responses
          </p>
        </div>
        <button
          onClick={() => {
            fetchAnswers();
            fetchFlags();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("grading")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "grading"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageSquare size={14} />
          To Grade
          {pendingCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("flags")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "flags"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Flag size={14} />
          Disputes
          {openFlagsCount > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {openFlagsCount > 9 ? "9+" : openFlagsCount}
            </span>
          )}
        </button>
      </div>

      {/* Grading Tab */}
      {tab === "grading" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show:</span>
            {(["PENDING", "AI_GRADED", "ALL"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setGradingFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  gradingFilter === f
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "PENDING"
                  ? t("trainer.grading.filterNeedsGrading")
                  : f === "AI_GRADED"
                  ? t("trainer.grading.filterAiReview")
                  : t("trainer.grading.filterAll")}
              </button>
            ))}
          </div>

          {loadingAnswers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-green-600" />
            </div>
          ) : answers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <CheckCircle size={48} className="mx-auto text-green-300 mb-3" />
              <p className="text-gray-600 font-medium">
                {gradingFilter === "PENDING"
                  ? t("trainer.grading.noAnswers")
                  : t("trainer.grading.noAnswersAlt")}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Check back after farmers complete their quizzes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {answers.map((item) => (
                <GradeCard key={item.id} item={item} onGraded={fetchAnswers} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flags Tab */}
      {tab === "flags" && (
        <div className="space-y-4">
          {loadingFlags ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-green-600" />
            </div>
          ) : flags.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Flag size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">No open disputes!</p>
              <p className="text-sm text-gray-400 mt-1">
                Farmers haven't raised any grading disputes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => (
                <FlagCard key={flag.id} flag={flag} onResolved={fetchFlags} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
