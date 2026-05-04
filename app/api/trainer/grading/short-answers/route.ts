// app/api/trainer/grading/short-answers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["TRAINER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING"; // PENDING | AI_GRADED | MANUALLY_GRADED | ALL
  const quizId = searchParams.get("quizId");

  const whereStatus = status === "ALL" ? undefined : status === "PENDING_OR_AI"
    ? { in: ["PENDING", "AI_GRADED"] as const }
    : status as "PENDING" | "AI_GRADED" | "MANUALLY_GRADED";

  // For trainers, only show answers for their own courses
  const trainerFilter = session.user.role === "TRAINER"
    ? { question: { quiz: { lesson: { module: { course: { trainerId: session.user.id } } } } } }
    : {};

  const answers = await db.quizAnswer.findMany({
    where: {
      question: { type: "SHORT_ANSWER" },
      ...(whereStatus ? { gradingStatus: whereStatus as any } : {}),
      ...(quizId ? { attempt: { quizId } } : {}),
      ...trainerFilter,
    },
    include: {
      attempt: {
        include: {
          farmer: { select: { id: true, name: true, email: true } },
          quiz: {
            include: {
              lesson: {
                include: {
                  module: {
                    include: {
                      course: { select: { id: true, title: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      question: {
        select: {
          id: true,
          stem: true,
          desiredResponse: true,
          aiGrading: true,
          feedback: true,
        },
      },
      flags: {
        where: { status: "OPEN" },
        select: { id: true, reason: true, createdAt: true },
      },
    },
    orderBy: { attempt: { completedAt: "desc" } },
  });

  return NextResponse.json({ success: true, data: answers });
}
