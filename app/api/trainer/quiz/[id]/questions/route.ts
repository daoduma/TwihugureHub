// app/api/trainer/quiz/[id]/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TRAINER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const quiz = await db.quiz.findFirst({
      where: { id: params.id, lesson: { module: { course: { trainerId: session.user.id } } } },
    });
    if (!quiz) return NextResponse.json({ success: false, error: "Quiz not found" }, { status: 404 });

    let body: { type?: string; stem?: unknown; options?: Array<{ text: object; isCorrect?: boolean }> } = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }
    const { type = "MULTIPLE_CHOICE", stem, options } = body;

    const maxOrder = await db.question.findFirst({
      where: { quizId: params.id },
      orderBy: { order: "desc" },
    });
    const order = (maxOrder?.order ?? -1) + 1;

    const question = await db.question.create({
      data: {
        quizId: params.id,
        type: type as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER",
        stem: (stem as object) ?? { en: "", fr: "", rw: "" },
        order,
        translationStatus: { en: "MANUAL", fr: "PENDING", rw: "PENDING" },
      },
    });

    // Create default options for MULTIPLE_CHOICE
    if (type === "MULTIPLE_CHOICE" && (!options || options.length === 0)) {
      await db.answerOption.createMany({
        data: [
          { questionId: question.id, text: { en: "", fr: "", rw: "" }, isCorrect: true, order: 0 },
          { questionId: question.id, text: { en: "", fr: "", rw: "" }, isCorrect: false, order: 1 },
        ],
      });
    } else if (type === "TRUE_FALSE") {
      await db.answerOption.createMany({
        data: [
          { questionId: question.id, text: { en: "True", fr: "Vrai", rw: "Ni ukuri" }, isCorrect: true, order: 0 },
          { questionId: question.id, text: { en: "False", fr: "Faux", rw: "Si ukuri" }, isCorrect: false, order: 1 },
        ],
      });
    } else if (options) {
      for (let i = 0; i < options.length; i++) {
        await db.answerOption.create({
          data: { questionId: question.id, text: options[i].text, isCorrect: options[i].isCorrect ?? false, order: i },
        });
      }
    }

    // Create default feedback
    await db.questionFeedback.create({
      data: {
        questionId: question.id,
        correctFeedback: { en: "", fr: "", rw: "" },
        incorrectFeedback: { en: "", fr: "", rw: "" },
      },
    });

    const full = await db.question.findUnique({
      where: { id: question.id },
      include: { options: { orderBy: { order: "asc" } }, feedback: true },
    });

    return NextResponse.json({ success: true, data: full }, { status: 201 });
  } catch (err) {
    console.error("[trainer/quiz/[id]/questions] POST error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create question" },
      { status: 500 }
    );
  }
}
