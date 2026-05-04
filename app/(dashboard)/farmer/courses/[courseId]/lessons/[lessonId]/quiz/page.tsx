// app/(dashboard)/farmer/courses/[courseId]/lessons/[lessonId]/quiz/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, ArrowLeft, Loader2, AlertTriangle, WifiOff, Flag } from "lucide-react";
import { useTranslation, useContentLanguage } from "@/lib/useTranslation";
import { savePendingAttempt } from "@/lib/offlineStorage";

interface AnswerOption {
  id: string;
  text: Record<string, string>;
  isCorrect: boolean;
  order: number;
}
interface QuestionFeedback {
  correctFeedback: Record<string, string>;
  incorrectFeedback: Record<string, string>;
}
interface Question {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  stem: Record<string, string>;
  order: number;
  options: AnswerOption[];
  feedback?: QuestionFeedback;
}
interface Quiz {
  id: string;
  title: Record<string, string>;
  passingScore: number;
  allowRetry: boolean;
  questions: Question[];
}

type Phase = "loading" | "translating" | "quiz" | "results";

interface AnswerMap {
  [questionId: string]: { selectedOptionId?: string; shortAnswerText?: string };
}

interface AttemptResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  attempt: {
    id: string;
    answers: Array<{
      id: string;
      questionId: string;
      selectedOptionId?: string;
      isCorrect: boolean;
      gradingStatus: string;
      manualScore: number | null;
      trainerFeedback: string | null;
    }>;
  };
}

function getText(obj: Record<string, string>, lang: string): string {
  return obj?.[lang] || obj?.["en"] || obj?.["fr"] || obj?.["rw"] || "";
}

export default function QuizPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const lang = useContentLanguage();

  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flaggingAnswerId, setFlaggingAnswerId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flaggedAnswerIds, setFlaggedAnswerIds] = useState<Set<string>>(new Set());
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  useEffect(() => {
    loadQuiz();
  }, [lessonId, lang]);

  const loadQuiz = async () => {
    setPhase("loading");
    try {
      // Fetch quiz via trainer API
      const res = await fetch(`/api/farmer/lessons/${lessonId}`);
      const data = await res.json();
      const rawQuiz: Quiz = data.lesson?.quiz;
      if (!rawQuiz) { setError("No quiz found for this lesson."); return; }

      // Check if translations are available
      const needsTranslation = rawQuiz.questions.some((q) => {
        const stem = q.stem[lang];
        return !stem || stem.trim() === "";
      });

      if (needsTranslation) {
        setPhase("translating");
        const transRes = await fetch(`/api/farmer/quiz/${rawQuiz.id}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: lang }),
        });
        const transData = await transRes.json();
        setQuiz(transData.quiz || rawQuiz);
      } else {
        setQuiz(rawQuiz);
      }
      setPhase("quiz");
    } catch (err) {
      setError("Failed to load quiz.");
      setPhase("loading");
    }
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { selectedOptionId: optionId } }));
  };

  const handleShortAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { shortAnswerText: text } }));
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentQ < quiz.questions.length - 1) setCurrentQ((q) => q + 1);
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    const payload = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id]?.selectedOptionId,
      shortAnswerText: answers[q.id]?.shortAnswerText,
    }));

    // If offline, store attempt in IndexedDB for later sync
    if (!navigator.onLine) {
      await savePendingAttempt({
        quizId: quiz.id,
        farmerId: session?.user?.id ?? "",
        answers: payload,
        languageUsed: lang,
        startedAt: startedAt.current,
        completedAt: new Date().toISOString(),
        synced: false,
      });
      setResult({ offlineSaved: true } as any);
      setPhase("results");
      setSubmitting(false);
      return;
    }

    const res = await fetch(`/api/farmer/quiz/${quiz.id}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload, languageUsed: lang, startedAt: startedAt.current }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setPhase("results");
    }
    setSubmitting(false);
  };

  const handleFlagAnswer = async (answerId: string) => {
    if (!flagReason.trim()) return;
    setFlagSubmitting(true);
    try {
      const res = await fetch("/api/farmer/short-answer-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId, reason: flagReason.trim() }),
      });
      if (res.ok) {
        setFlaggedAnswerIds((prev) => new Set([...prev, answerId]));
        setFlaggingAnswerId(null);
        setFlagReason("");
      }
    } finally {
      setFlagSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    startedAt.current = new Date().toISOString();
    setPhase("quiz");
  };

  if (error) return (
    <div className="max-w-xl mx-auto text-center py-16 space-y-4">
      <AlertTriangle size={48} className="mx-auto text-amber-400" />
      <p className="text-gray-600">{error}</p>
      <Link href={`/farmer/courses/${courseId}/lessons/${lessonId}`} className="btn btn-outline">← {t("farmer.lesson.backToCourse" as never) || "Back"}</Link>
    </div>
  );

  if (phase === "loading") return (
    <div className="text-center py-16">
      <Loader2 size={32} className="mx-auto animate-spin text-brand-500 mb-3" />
      <p className="text-gray-500">{t("ui.loading" as never)}</p>
    </div>
  );

  if (phase === "translating") return (
    <div className="text-center py-16">
      <Loader2 size={32} className="mx-auto animate-spin text-brand-500 mb-3" />
      <p className="text-gray-700 font-medium">{t("farmer.quiz.translating" as never) || "Preparing quiz in your language..."}</p>
      <p className="text-sm text-gray-400 mt-1">{t("farmer.quiz.translatingHint" as never) || "This may take a few seconds."}</p>
    </div>
  );

  if (phase === "results" && result && quiz) {
    // Offline saved state
    if ((result as any).offlineSaved) {
      return (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="card p-8 text-center border-amber-200 bg-amber-50">
            <WifiOff size={56} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t("offline.quizSavedTitle" as never) || "Quiz Saved Offline"}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("offline.quizSavedBody" as never) ||
                "Your answers have been saved. They will be automatically submitted when you reconnect to the internet."}
            </p>
            <Link
              href={`/farmer/courses/${courseId}`}
              className="btn btn-primary"
            >
              {t("farmer.lesson.backToCourse" as never) || "Back to Course"}
            </Link>
          </div>
        </div>
      );
    }

    const pct = result.score;
    const passed = result.passed;
    return (
      <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
        <div className={`card p-8 text-center ${passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          {passed ? (
            <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          ) : (
            <XCircle size={56} className="mx-auto text-red-400 mb-4" />
          )}
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {passed ? (t("farmer.quiz.passed" as never) || "Congratulations! You Passed!") : (t("farmer.quiz.failed" as never) || "Not Quite There Yet")}
          </h2>
          <p className="text-4xl font-bold mt-3" style={{ color: passed ? "#16a34a" : "#dc2626" }}>{pct}%</p>
          <p className="text-sm text-gray-600 mt-2">
            {result.correctCount}/{result.totalQuestions} {t("farmer.quiz.correct" as never) || "correct"} · {t("farmer.quiz.passingScore" as never) || "Passing"}: {quiz.passingScore}%
          </p>
        </div>

        {/* Per-question breakdown */}
        <div className="card divide-y divide-gray-100">
          <div className="px-5 py-3 font-semibold text-gray-700">{t("farmer.quiz.breakdown" as never) || "Question Breakdown"}</div>
          {quiz.questions.map((q, idx) => {
            const ans = result.attempt.answers.find((a) => a.questionId === q.id);
            const correct = ans?.isCorrect ?? false;
            const correctOption = q.options.find((o) => o.isCorrect);
            const feedback = q.feedback;
            const isShortAnswer = q.type === "SHORT_ANSWER";
            const isPendingGrade = isShortAnswer && ans?.gradingStatus === "PENDING";
            const isGraded = isShortAnswer && (ans?.gradingStatus === "MANUALLY_GRADED" || ans?.gradingStatus === "AI_GRADED");
            const isFlagged = ans?.id ? flaggedAnswerIds.has(ans.id) : false;
            return (
              <div key={q.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  {isShortAnswer ? (
                    isPendingGrade ? (
                      <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    ) : correct ? (
                      <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    )
                  ) : correct ? (
                    <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Q{idx + 1}. {getText(q.stem, lang)}</p>

                    {/* Short answer specific display */}
                    {isShortAnswer && (
                      <div className="mt-2 space-y-1.5">
                        {isPendingGrade && (
                          <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-1.5">
                            {t("farmer.quiz.awaitingGrading" as never)}
                          </p>
                        )}
                        {isGraded && (
                          <div className="text-xs space-y-1">
                            <p className={`font-medium ${correct ? "text-green-700" : "text-red-600"}`}>
                              {t("farmer.quiz.scoreLabel" as never)}: {ans?.manualScore ?? 0}{t("farmer.quiz.outOf" as never)} · {correct ? t("farmer.quiz.correct" as never) : t("farmer.quiz.incorrect" as never)}
                              {ans?.gradingStatus === "AI_GRADED" && ` ${t("farmer.quiz.aiGraded" as never)}`}
                            </p>
                            {ans?.trainerFeedback && (
                              <p className="text-gray-600 italic">{t("farmer.quiz.feedbackLabel" as never)}: {ans.trainerFeedback}</p>
                            )}
                          </div>
                        )}

                        {/* Flag button for graded short answers */}
                        {isGraded && ans?.id && !isFlagged && (
                          <>
                            {flaggingAnswerId === ans.id ? (
                              <div className="mt-2 space-y-2">
                                <textarea
                                  value={flagReason}
                                  onChange={(e) => setFlagReason(e.target.value)}
                                  placeholder={t("farmer.quiz.disputePlaceholder" as never)}
                                  className="input w-full h-20 resize-none text-sm"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleFlagAnswer(ans.id)}
                                    disabled={!flagReason.trim() || flagSubmitting}
                                    className="btn btn-primary text-xs py-1.5 disabled:opacity-50"
                                  >
                                    {flagSubmitting ? <Loader2 size={12} className="animate-spin mr-1" /> : <Flag size={12} className="mr-1" />}
                                    {t("farmer.quiz.submitDispute" as never)}                                  </button>
                                  <button
                                    onClick={() => { setFlaggingAnswerId(null); setFlagReason(""); }}
                                    className="btn btn-outline text-xs py-1.5"
                                  >
                                    {t("ui.cancel")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setFlaggingAnswerId(ans.id)}
                                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1"
                              >
                                <Flag size={11} />
                                {t("farmer.quiz.disputeGrade" as never)}
                              </button>
                            )}
                          </>
                        )}
                        {isFlagged && (
                          <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                            <Flag size={11} /> {t("farmer.quiz.disputeSubmitted" as never)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* MC/TF answer display */}
                    {!isShortAnswer && ans?.selectedOptionId && (
                      <p className="text-sm text-gray-500 mt-1">
                        {t("farmer.quiz.yourAnswer" as never) || "Your answer:"} {getText(q.options.find((o) => o.id === ans.selectedOptionId)?.text || {}, lang)}
                      </p>
                    )}
                    {!isShortAnswer && !correct && correctOption && (
                      <p className="text-sm text-green-700 mt-0.5">
                        ✓ {t("farmer.quiz.correctAnswer" as never) || "Correct:"} {getText(correctOption.text, lang)}
                      </p>
                    )}
                    {!isShortAnswer && feedback && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        {correct ? getText(feedback.correctFeedback, lang) : getText(feedback.incorrectFeedback, lang)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 flex-wrap">
          {passed && (
            <Link href={`/farmer/courses/${courseId}/lessons/${lessonId}`} className="btn btn-primary flex-1">
              {t("farmer.quiz.continueNext" as never) || "Continue to Next Lesson"} →
            </Link>
          )}
          {!passed && quiz.allowRetry && (
            <button onClick={handleRetry} className="btn btn-primary flex-1">
              {t("farmer.quiz.tryAgain" as never) || "Try Again"}
            </button>
          )}
          {!passed && !quiz.allowRetry && (
            <div className="card p-4 flex-1 text-center text-sm text-gray-600">
              {t("farmer.quiz.contactTrainer" as never) || "Please contact your trainer for assistance."}
            </div>
          )}
          <Link href={`/farmer/courses/${courseId}`} className="btn btn-outline">
            {t("farmer.lesson.backToCourse" as never) || "Back to Course"}
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz) return null;
  const question = quiz.questions[currentQ];
  const totalQ = quiz.questions.length;
  const currentAnswer = answers[question.id];
  const isAnswered = !!(currentAnswer?.selectedOptionId || currentAnswer?.shortAnswerText);
  const isLastQuestion = currentQ === totalQ - 1;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/farmer/courses/${courseId}/lessons/${lessonId}`} className="text-brand-600 hover:text-brand-700">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{getText(quiz.title, lang)}</p>
          <div className="mt-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }} />
          </div>
        </div>
        <span className="text-sm font-medium text-gray-600">{currentQ + 1}/{totalQ}</span>
      </div>

      <div className="card p-6 space-y-6">
        <p className="text-lg font-semibold text-gray-800 leading-relaxed">
          {getText(question.stem, lang)}
        </p>

        {question.type === "MULTIPLE_CHOICE" && (
          <div className="space-y-2">
            {question.options.map((opt) => {
              const selected = currentAnswer?.selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(question.id, opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    selected ? "border-brand-500 bg-brand-50 text-brand-800" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {getText(opt.text, lang)}
                </button>
              );
            })}
          </div>
        )}

        {question.type === "TRUE_FALSE" && (
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt) => {
              const selected = currentAnswer?.selectedOptionId === opt.id;
              const label = getText(opt.text, lang);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(question.id, opt.id)}
                  className={`py-5 rounded-xl border-2 text-lg font-bold transition-all ${
                    selected ? "border-brand-500 bg-brand-50 text-brand-800" : "border-gray-200 hover:border-brand-300 text-gray-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {question.type === "SHORT_ANSWER" && (
          <div>
            <p className="text-xs text-gray-400 mb-2">{t("quiz.shortAnswerNote" as never)}</p>
            <textarea
              value={currentAnswer?.shortAnswerText || ""}
              onChange={(e) => handleShortAnswer(question.id, e.target.value)}
              placeholder={t("farmer.quiz.typeAnswer" as never) || "Type your answer here..."}
              className="input w-full h-32 resize-none"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {!isLastQuestion ? (
            <button
              onClick={handleNext}
              disabled={!isAnswered}
              className="btn btn-primary disabled:opacity-50"
            >
              {t("farmer.quiz.nextQuestion" as never) || "Next Question"} →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isAnswered || submitting}
              className="btn btn-primary disabled:opacity-50"
            >
              {submitting ? <><Loader2 size={16} className="animate-spin mr-2" /> {t("farmer.quiz.submitting" as never)}</> : (t("farmer.quiz.submit" as never) || "Submit Quiz")}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-center text-gray-400">
        {t("farmer.quiz.passingRequired" as never) || "Passing score required:"} {quiz.passingScore}%
      </p>
    </div>
  );
}
