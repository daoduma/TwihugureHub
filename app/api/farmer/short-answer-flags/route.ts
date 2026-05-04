// app/api/farmer/short-answer-flags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "FARMER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const farmerId = session.user.id;
  const body = await req.json();
  const { answerId, reason } = body as { answerId: string; reason: string };

  if (!answerId || !reason?.trim()) {
    return NextResponse.json({ success: false, error: "answerId and reason are required" }, { status: 400 });
  }

  // Verify the answer belongs to this farmer
  const answer = await db.quizAnswer.findUnique({
    where: { id: answerId },
    include: {
      attempt: {
        include: {
          quiz: {
            include: {
              lesson: {
                include: {
                  module: {
                    include: {
                      course: {
                        include: {
                          trainer: { select: { id: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      question: { select: { type: true } },
    },
  });

  if (!answer || answer.attempt.farmerId !== farmerId) {
    return NextResponse.json({ success: false, error: "Answer not found" }, { status: 404 });
  }

  if (answer.question.type !== "SHORT_ANSWER") {
    return NextResponse.json({ success: false, error: "Can only flag short answer questions" }, { status: 400 });
  }

  // Check for existing open flag
  const existingFlag = await db.shortAnswerFlag.findFirst({
    where: { answerId, farmerId, status: "OPEN" },
  });

  if (existingFlag) {
    return NextResponse.json({ success: false, error: "A flag is already open for this answer" }, { status: 409 });
  }

  const flag = await db.shortAnswerFlag.create({
    data: { answerId, farmerId, reason: reason.trim() },
  });

  // Notify trainer
  const trainerId = answer.attempt.quiz.lesson.module.course.trainer.id;
  await createNotification(
    trainerId,
    "SHORT_ANSWER_FLAGGED",
    {
      en: "Short Answer Result Disputed",
      fr: "Résultat de réponse courte contesté",
      rw: "Igisubizo gito cyaburiwe",
    },
    {
      en: `A farmer has disputed their short answer grade. Reason: ${reason.trim().slice(0, 100)}`,
      fr: `Un agriculteur a contesté sa note. Raison: ${reason.trim().slice(0, 100)}`,
      rw: `Umuhinzi yaburanye amanota ye. Impamvu: ${reason.trim().slice(0, 100)}`,
    },
    { type: "short_answer_flag", id: flag.id }
  );

  // Notify all admins
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  for (const admin of admins) {
    await createNotification(
      admin.id,
      "SHORT_ANSWER_FLAGGED",
      undefined,
      {
        en: `A farmer disputed a short answer grade. Reason: ${reason.trim().slice(0, 100)}`,
        fr: `Un agriculteur a contesté une note. Raison: ${reason.trim().slice(0, 100)}`,
        rw: `Umuhinzi yaburanye amanota. Impamvu: ${reason.trim().slice(0, 100)}`,
      },
      { type: "short_answer_flag", id: flag.id }
    );
  }

  return NextResponse.json({ success: true, data: flag }, { status: 201 });
}
