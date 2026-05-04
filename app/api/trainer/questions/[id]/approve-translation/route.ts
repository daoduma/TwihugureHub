// app/api/trainer/questions/[id]/approve-translation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const question = await db.question.findFirst({
    where: { id: params.id, quiz: { lesson: { module: { course: { trainerId: session.user.id } } } } },
  });
  if (!question) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });

  const { language, action, editedText, editedOptions, editedCorrectFeedback, editedIncorrectFeedback } = await req.json();

  const tsObj = question.translationStatus as Record<string, string>;

  if (action === "approve" || action === "edit_approve") {
    // Guard: edit_approve without text would corrupt the stem — treat as a bad request
    if (action === "edit_approve" && !editedText) {
      return NextResponse.json({ success: false, error: "editedText is required for edit_approve" }, { status: 400 });
    }

    const newTs = { ...tsObj, [language]: "MANUAL" };
    const updates: Record<string, unknown> = { translationStatus: newTs };

    if (action === "edit_approve" && editedText) {
      const stemObj = question.stem as Record<string, string>;
      updates.stem = { ...stemObj, [language]: editedText };
    }

    await db.question.update({ where: { id: params.id }, data: updates });

    // Update edited options if provided
    if (action === "edit_approve" && editedOptions) {
      for (const opt of editedOptions) {
        const existing = await db.answerOption.findFirst({ where: { id: opt.id, questionId: params.id } });
        if (existing) {
          const textObj = existing.text as Record<string, string>;
          await db.answerOption.update({
            where: { id: opt.id },
            data: { text: { ...textObj, [language]: opt.text } },
          });
        }
      }
    }

    // Update feedback if edited
    if (action === "edit_approve" && (editedCorrectFeedback !== undefined || editedIncorrectFeedback !== undefined)) {
      const fb = await db.questionFeedback.findUnique({ where: { questionId: params.id } });
      if (fb) {
        const cfObj = fb.correctFeedback as Record<string, string>;
        const ifObj = fb.incorrectFeedback as Record<string, string>;
        await db.questionFeedback.update({
          where: { questionId: params.id },
          data: {
            ...(editedCorrectFeedback !== undefined && { correctFeedback: { ...cfObj, [language]: editedCorrectFeedback } }),
            ...(editedIncorrectFeedback !== undefined && { incorrectFeedback: { ...ifObj, [language]: editedIncorrectFeedback } }),
          },
        });
      }
    }
  } else if (action === "reject") {
    // Reset to PENDING
    await db.question.update({
      where: { id: params.id },
      data: { translationStatus: { ...tsObj, [language]: "PENDING" } },
    });
  }

  const updated = await db.question.findUnique({
    where: { id: params.id },
    include: { options: { orderBy: { order: "asc" } }, feedback: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
