// app/api/trainer/quiz/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedQuiz(quizId: string, trainerId: string) {
  return db.quiz.findFirst({
    where: { id: quizId, lesson: { module: { course: { trainerId } } } },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const quiz = await getOwnedQuiz(params.id, session.user.id);
  if (!quiz) return NextResponse.json({ success: false, error: "Quiz not found" }, { status: 404 });

  const body = await req.json();
  const updated = await db.quiz.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.passingScore !== undefined && { passingScore: body.passingScore }),
      ...(body.allowRetry !== undefined && { allowRetry: body.allowRetry }),
    },
  });
  return NextResponse.json({ success: true, data: updated });
}
