// app/api/trainer/lessons/[id]/quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, module: { course: { trainerId: session.user.id } } },
  });
  if (!lesson) return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });

  const quiz = await db.quiz.findUnique({
    where: { lessonId: params.id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } }, feedback: true },
      },
    },
  });

  return NextResponse.json({ success: true, data: quiz });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, module: { course: { trainerId: session.user.id } } },
  });
  if (!lesson) return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });

  const existing = await db.quiz.findUnique({ where: { lessonId: params.id } });
  if (existing) return NextResponse.json({ success: false, error: "Quiz already exists" }, { status: 409 });

  const body = await req.json();
  const quiz = await db.quiz.create({
    data: {
      lessonId: params.id,
      title: body.title ?? { en: "Quiz", fr: "Quiz", rw: "Ikizamini" },
      passingScore: body.passingScore ?? 70,
      allowRetry: body.allowRetry ?? true,
    },
    include: { questions: { include: { options: true, feedback: true } } },
  });

  return NextResponse.json({ success: true, data: quiz }, { status: 201 });
}
