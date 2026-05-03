// app/api/farmer/lessons/[id]/complete/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmerId = session.user.id;
  const lessonId = params.id;
  const body = await req.json().catch(() => ({}));
  const timeSpentSeconds: number = body.timeSpentSeconds ?? 0;

  const progress = await db.lessonProgress.upsert({
    where: { farmerId_lessonId: { farmerId, lessonId } },
    update: { completedAt: new Date(), timeSpentSeconds },
    create: { farmerId, lessonId, completedAt: new Date(), timeSpentSeconds },
  });

  // Recalculate enrollment progress
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { include: { modules: { include: { lessons: { select: { id: true } } } } } } } } },
  });

  if (lesson) {
    const courseId = lesson.module.courseId;
    const allLessonIds = lesson.module.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completedCount = await db.lessonProgress.count({
      where: { farmerId, lessonId: { in: allLessonIds }, completedAt: { not: null } },
    });
    const progressPercent = Math.round((completedCount / allLessonIds.length) * 100);

    await db.enrollment.updateMany({
      where: { farmerId, courseId },
      data: {
        progressPercent,
        completedAt: progressPercent === 100 ? new Date() : null,
      },
    });
  }

  return NextResponse.json({ progress });
}
