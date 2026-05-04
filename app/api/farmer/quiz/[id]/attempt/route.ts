// app/api/farmer/quiz/[id]/attempt/route.ts
// CHANGED: Added audit logging for quiz attempts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { maybeIssueCertificate } from "@/lib/certificates";
import { logAction, AuditActions } from "@/lib/auditLog";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 }, { status: 401 });
  }

  const farmerId = session.user.id;
  const quizId = params.id;
  const body = await req.json();
  const { answers, languageUsed, startedAt } = body as {
    answers: Array<{ questionId: string; selectedOptionId?: string; shortAnswerText?: string }>;
    languageUsed: string;
    startedAt: string;
  };

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { include: { options: true } },
      lesson: { include: { module: { include: { course: { include: { modules: { include: { lessons: { select: { id: true } } } } } } } } } },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Quiz not found", code: "NOT_FOUND", statusCode: 404 }, { status: 404 });

  // Score calculation
  let correctCount = 0;
  const answerResults: Array<{ questionId: string; selectedOptionId?: string; shortAnswerText?: string; isCorrect: boolean; gradingStatus: string }> = [];

  for (const question of quiz.questions) {
    const userAnswer = answers.find((a) => a.questionId === question.id);
    let isCorrect = false;
    let gradingStatus = "PENDING";
    if (question.type === "SHORT_ANSWER") {
      // Short answers need grading - either AI or manual
      isCorrect = false; // Default until graded
      gradingStatus = "PENDING";
    } else if (userAnswer?.selectedOptionId) {
      const opt = question.options.find((o) => o.id === userAnswer.selectedOptionId);
      isCorrect = opt?.isCorrect ?? false;
      gradingStatus = "MANUALLY_GRADED"; // MC/TF are auto-graded
    }
    if (isCorrect) correctCount++;
    answerResults.push({ questionId: question.id, selectedOptionId: userAnswer?.selectedOptionId, shortAnswerText: userAnswer?.shortAnswerText, isCorrect, gradingStatus });
  }

  const totalQuestions = quiz.questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= quiz.passingScore;

  const previousAttempts = await db.quizAttempt.count({ where: { farmerId, quizId } });

  const attempt = await db.quizAttempt.create({
    data: {
      farmerId, quizId, attemptNumber: previousAttempts + 1, score, passed, languageUsed,
      startedAt: new Date(startedAt), completedAt: new Date(),
      answers: { create: answerResults.map((a) => ({ questionId: a.questionId, selectedOptionId: a.selectedOptionId, shortAnswerText: a.shortAnswerText, isCorrect: a.isCorrect, gradingStatus: a.gradingStatus as any })) },
    },
    include: {
      answers: {
        select: {
          id: true,
          questionId: true,
          selectedOptionId: true,
          shortAnswerText: true,
          isCorrect: true,
          gradingStatus: true,
          manualScore: true,
          trainerFeedback: true,
        },
      },
    },
  });

  // Trigger AI grading for short answers with aiGrading enabled
  const shortAnswerQuestions = quiz.questions.filter((q) => q.type === "SHORT_ANSWER");
  for (const question of shortAnswerQuestions) {
    if ((question as any).aiGrading) {
      const answerRecord = attempt.answers.find((a) => a.questionId === question.id);
      if (answerRecord?.shortAnswerText) {
        // Fire and forget AI grading in background
        fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/trainer/grading/short-answers/${answerRecord.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch((err) => console.error("[AI Grading] Background job failed:", err));
      }
    }
  }

  // CHANGED: Audit log for quiz attempt
  await logAction(farmerId, passed ? AuditActions.QUIZ_PASSED : AuditActions.QUIZ_FAILED, "QuizAttempt", attempt.id, {
    quizId, score, passed, attemptNumber: previousAttempts + 1, languageUsed,
  });

  if (passed) {
    const lessonId = quiz.lessonId;
    await db.lessonProgress.upsert({
      where: { farmerId_lessonId: { farmerId, lessonId } },
      update: { completedAt: new Date() },
      create: { farmerId, lessonId, completedAt: new Date(), timeSpentSeconds: 0 },
    });

    const courseId = quiz.lesson.module.courseId;
    const allLessonIds = quiz.lesson.module.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completedCount = await db.lessonProgress.count({
      where: { farmerId, lessonId: { in: allLessonIds }, completedAt: { not: null } },
    });
    const progressPercent = Math.round((completedCount / allLessonIds.length) * 100);

    const enrollment = await db.enrollment.findFirst({ where: { farmerId, courseId } });

    await db.enrollment.updateMany({
      where: { farmerId, courseId },
      data: { progressPercent, completedAt: progressPercent === 100 ? new Date() : null },
    });

    if (progressPercent === 100 && enrollment) {
      await maybeIssueCertificate(enrollment.id);
    } else {
      // CHANGED: notify farmer they passed the quiz
      await createNotification(farmerId, "QUIZ_PASSED", undefined, undefined, { type: "quiz", id: quizId });
    }
  } else {
    await createNotification(farmerId, "QUIZ_FAILED", undefined, undefined, { type: "quiz", id: quizId });
  }

  return NextResponse.json({ attempt, score, passed, correctCount, totalQuestions });
}
