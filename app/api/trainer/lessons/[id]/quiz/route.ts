// app/api/trainer/lessons/[id]/quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TRAINER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const lesson = await db.lesson.findFirst({
      where: { id: params.id, module: { course: { trainerId: session.user.id } } },
    });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

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
  } catch (err) {
    console.error("[trainer/lessons/[id]/quiz] GET error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load quiz",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TRAINER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const lesson = await db.lesson.findFirst({
      where: { id: params.id, module: { course: { trainerId: session.user.id } } },
    });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Idempotent: if a quiz already exists, return it instead of erroring.
    // (Previously returned 409 which the client surfaced as a confusing error.)
    const existing = await db.quiz.findUnique({
      where: { lessonId: params.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } }, feedback: true },
        },
      },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: existing }, { status: 200 });
    }

    // Body is optional — fall back to defaults if it isn't sent or isn't JSON.
    let body: { title?: unknown; passingScore?: unknown; allowRetry?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // empty/invalid body — use defaults below
    }

    const quiz = await db.quiz.create({
      data: {
        lessonId: params.id,
        title:
          (body.title as object) ?? { en: "Lesson Quiz", fr: "Quiz de la leçon", rw: "Ikizamini cy'isomo" },
        passingScore: typeof body.passingScore === "number" ? body.passingScore : 70,
        allowRetry: typeof body.allowRetry === "boolean" ? body.allowRetry : true,
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } }, feedback: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: quiz }, { status: 201 });
  } catch (err) {
    console.error("[trainer/lessons/[id]/quiz] POST error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create quiz",
      },
      { status: 500 }
    );
  }
}
