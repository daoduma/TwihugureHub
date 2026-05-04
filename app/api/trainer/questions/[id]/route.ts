// app/api/trainer/questions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedQuestion(questionId: string, trainerId: string) {
  return db.question.findFirst({
    where: { id: questionId, quiz: { lesson: { module: { course: { trainerId } } } } },
    include: { options: { orderBy: { order: "asc" } }, feedback: true },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const question = await getOwnedQuestion(params.id, session.user.id);
  if (!question) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });

  const body = await req.json();
  const { stem, type, translationStatus, options, feedback } = body;

  const updated = await db.question.update({
    where: { id: params.id },
    data: {
      ...(stem !== undefined && { stem }),
      ...(type !== undefined && { type }),
      ...(translationStatus !== undefined && { translationStatus }),
    },
  });

  // Replace all options atomically to avoid orphaned/duplicate rows
  if (options !== undefined) {
    // Delete all existing options for this question then recreate
    await db.answerOption.deleteMany({ where: { questionId: params.id } });
    if (options.length > 0) {
      await db.answerOption.createMany({
        data: options.map((opt: { text: Record<string, string>; isCorrect: boolean }, i: number) => ({
          questionId: params.id,
          text: opt.text ?? { en: "", fr: "", rw: "" },
          isCorrect: opt.isCorrect ?? false,
          order: i,
        })),
      });
    }
  }

  // Update feedback if provided
  if (feedback) {
    await db.questionFeedback.upsert({
      where: { questionId: params.id },
      create: {
        questionId: params.id,
        correctFeedback: feedback.correctFeedback ?? { en: "", fr: "", rw: "" },
        incorrectFeedback: feedback.incorrectFeedback ?? { en: "", fr: "", rw: "" },
      },
      update: {
        ...(feedback.correctFeedback !== undefined && { correctFeedback: feedback.correctFeedback }),
        ...(feedback.incorrectFeedback !== undefined && { incorrectFeedback: feedback.incorrectFeedback }),
      },
    });
  }

  const full = await db.question.findUnique({
    where: { id: params.id },
    include: { options: { orderBy: { order: "asc" } }, feedback: true },
  });

  return NextResponse.json({ success: true, data: full });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const question = await getOwnedQuestion(params.id, session.user.id);
  if (!question) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });

  await db.question.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, message: "Question deleted" });
}
