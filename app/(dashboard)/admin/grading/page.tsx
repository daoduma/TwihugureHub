// app/(dashboard)/admin/grading/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Flag,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

type FlagStatus = "OPEN" | "REVIEWED" | "RESOLVED";

interface FlagItem {
  id: string;
  reason: string;
  status: FlagStatus;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  farmer: { id: string; name: string; email: string };
  resolvedBy: { id: string; name: string } | null;
  answer: {
    id: string;
    shortAnswerText: string | null;
    manualScore: number | null;
    gradingStatus: string;
    trainerFeedback: string | null;
    question: {
      stem: Record<string, string>;
      desiredResponse: Record<string, string> | null;
    };
    attempt: {
      quiz: {
        title: Record<string, string>;
        lesson: {
          title: Record<string, string>;
          module: {
            course: {
              id: string;
              title: Record<string, string>;
              trainer?: { name: string };
            };
          };
        };
      };
    };
  };
}

function getText(obj: Record<string, string> | null | undefined): string {
  if (!obj) return "";
  return obj.en || obj.fr || obj.rw || "";
}

function StatusBadge({ status }: { status: FlagStatus }) {
  const styles: Record<FlagStatus, string> = {
    OPEN: "bg-red-100 text-red-700",
    REVIEWED: "bg-yellow-100 text-yellow-700",
    RESOLVED: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function FlagRow({ flag, onResolved }: { flag: FlagItem; onResolved: () => void }) {
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
    <div className={`border rounded-xl overflow-hidden ${flag.status === "OPEN" ? "border-red-200" : "border-gray-200"}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Flag size={14} className={flag.status === "OPEN" ? "text-red-500" : "text-gray-400"} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {getText(flag.answer.question.stem)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {flag.farmer.name} · {getText(flag.answer.attempt.quiz.lesson.module.course.title)} ·{" "}
            {new Date(flag.createdAt).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={flag.status} />
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Farmer's Dispute</p>
              <p className="text-sm text-gray-800 bg-red-50 border border-red-100 rounded-lg p-3">{flag.reason}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Farmer's Answer</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
                {flag.answer.shortAnswerText || <span className="italic text-gray-400">No answer</span>}
              </p>
            </div>
          </div>

          {flag.answer.question.desiredResponse && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Expected Answer</p>
              <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3">
                {getText(flag.answer.question.desiredResponse)}
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">Current Score:</span> {flag.answer.manualScore ?? "Not graded"}</p>
            <p><span className="font-medium">Grading Status:</span> {flag.answer.gradingStatus}</p>
            {flag.answer.trainerFeedback && (
              <p><span className="font-medium">Trainer Feedback:</span> {flag.answer.trainerFeedback}</p>
            )}
          </div>

          {flag.status === "OPEN" && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adjustScore}
                  onChange={(e) => setAdjustScore(e.target.checked)}
                  className="rounded text-green-600"
                />
                <span className="text-sm text-gray-700">Override the score</span>
              </label>

              {adjustScore && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Score (0–100)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={0} max={100} step={5} value={newScore}
                      onChange={(e) => setNewScore(Number(e.target.value))}
                      className="flex-1 accent-green-600"
                    />
                    <span className={`text-lg font-bold w-12 text-center ${newScore >= 50 ? "text-green-600" : "text-red-500"}`}>
                      {newScore}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Resolution Note</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={2}
                  placeholder="Explain the decision to the farmer..."
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
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Resolve
                </button>
              </div>
            </div>
          )}

          {flag.status !== "OPEN" && flag.resolution && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">Resolution</p>
              <p className="text-sm text-gray-700">{flag.resolution}</p>
              {flag.resolvedBy && (
                <p className="text-xs text-gray-400 mt-1">By {flag.resolvedBy.name} · {flag.resolvedAt ? new Date(flag.resolvedAt).toLocaleDateString() : ""}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminGradingPage() {
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "REVIEWED" | "RESOLVED" | "ALL">("OPEN");
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trainer/short-answer-flags?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) setFlags(data.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={22} className="text-green-600" />
            Grade Disputes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review farmer short answer grade disputes across all courses
          </p>
        </div>
        <button
          onClick={fetchFlags}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["OPEN", "REVIEWED", "RESOLVED", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "ALL" ? "All" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Flag size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} disputes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <FlagRow key={flag.id} flag={flag} onResolved={fetchFlags} />
          ))}
        </div>
      )}
    </div>
  );
}
