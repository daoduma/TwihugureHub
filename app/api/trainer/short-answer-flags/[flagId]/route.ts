// app/api/trainer/short-answer-flags/[flagId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function PUT(
  req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["TRAINER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { flagId } = params;
  const body = await req.json();
  const { resolution, newScore, status } = body as {
    resolution: string;
    newScore?: number;
    status: "REVIEWED" | "RESOLVED";
  };

  const flag = await db.shortAnswerFlag.findUnique({
    where: { id: flagId },
    include: {
      answer: {
        include: {
          attempt: {
            include: {
              quiz: {
                include: {
                  lesson: { include: { module: { include: { course: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!flag) {
    return NextResponse.json({ success: false, error: "Flag not found" }, { status: 404 });
  }

  if (
    session.user.role === "TRAINER" &&
    flag.answer.attempt.quiz.lesson.module.course.trainerId !== session.user.id
  ) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Update the flag
  const updatedFlag = await db.shortAnswerFlag.update({
    where: { id: flagId },
    data: {
      status,
      resolution: resolution ?? null,
      resolvedById: session.user.id,
      resolvedAt: new Date(),
    },
  });

  // If a new score is provided, update the answer
  if (typeof newScore === "number" && newScore >= 0 && newScore <= 100) {
    await db.quizAnswer.update({
      where: { id: flag.answerId },
      data: {
        manualScore: newScore,
        isCorrect: newScore >= 50,
        gradingStatus: "MANUALLY_GRADED",
        trainerFeedback: resolution,
      },
    });

    // Recalculate attempt score
    const allAnswers = await db.quizAnswer.findMany({
      where: { attemptId: flag.answer.attemptId },
      include: { question: { select: { type: true } } },
    });

    const totalQ = allAnswers.length;
    let correctCount = 0;
    for (const a of allAnswers) {
      if (a.question.type === "SHORT_ANSWER") {
        const score = a.id === flag.answerId ? newScore : (a.manualScore ?? 0);
        if (score >= 50) correctCount++;
      } else if (a.isCorrect) {
        correctCount++;
      }
    }

    const recalcScore = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const quiz = flag.answer.attempt.quiz;
    const newPassed = recalcScore >= quiz.passingScore;

    await db.quizAttempt.update({
      where: { id: flag.answer.attemptId },
      data: { score: recalcScore, passed: newPassed },
    });
  }

  // Notify the farmer of flag resolution
  await createNotification(
    flag.farmerId,
    "SHORT_ANSWER_GRADED",
    {
      en: "Your grade dispute has been reviewed",
      fr: "Votre contestation de note a été examinée",
      rw: "Ikibazo cyawe cy'amanota cyasuzumwe",
    },
    {
      en: resolution
        ? `Your grade dispute has been resolved. Feedback: ${resolution}`
        : "Your grade dispute has been reviewed.",
      fr: resolution
        ? `Votre contestation a été résolue. Commentaire: ${resolution}`
        : "Votre contestation a été examinée.",
      rw: resolution
        ? `Ikibazo cyawe cyasubijwe. Igisubizo: ${resolution}`
        : "Ikibazo cyawe cy'amanota cyasuzumwe.",
    },
    { type: "short_answer_flag", id: flagId }
  );

  return NextResponse.json({ success: true, data: updatedFlag });
}
