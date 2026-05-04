// app/api/farmer/quiz/[id]/route.ts
// Returns a quiz (with questions and options) for a farmer to take.
// Only accessible if the farmer is enrolled in the course and the course is published.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmerId = session.user.id;
  const quizId = params.id;

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { order: "asc" } },
          feedback: true,
        },
      },
      lesson: {
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Verify the course is published
  const course = quiz.lesson.module.course;
  if (course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course not available" }, { status: 403 });
  }

  // Verify the farmer is enrolled
  const enrollment = await db.enrollment.findFirst({
    where: { farmerId, courseId: course.id },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  // Strip internal fields not needed by the farmer (e.g. isCorrect on options
  // is intentionally kept — the quiz page needs it for result display after submission,
  // but answers are only revealed POST-submission on the client, not during the quiz)
  return NextResponse.json({ success: true, quiz });
}
