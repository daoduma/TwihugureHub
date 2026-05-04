// app/api/farmer/courses/[id]/route.ts
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
  const courseId = params.id;

  const [course, enrollment, lessonProgressRecords, reviews] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: { attachments: true, quiz: { select: { id: true } } },
            },
          },
        },
        trainer: { select: { id: true, name: true, email: true } },
      },
    }),
    db.enrollment.findUnique({ where: { farmerId_courseId: { farmerId, courseId } } }),
    db.lessonProgress.findMany({ where: { farmerId } }),
    db.courseReview.findMany({
      where: { courseId },
      include: { farmer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const completedLessonIds = new Set(
    lessonProgressRecords.filter((lp) => lp.completedAt).map((lp) => lp.lessonId)
  );

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return NextResponse.json({
    course,
    enrollment,
    completedLessonIds: Array.from(completedLessonIds),
    reviews,
    averageRating,
  });
}
