// app/api/trainer/reports/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trainerId = session.user.id;

  const courses = await db.course.findMany({
    where: { trainerId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      enrollments: {
        select: {
          progressPercent: true,
          completedAt: true,
          farmerId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const courseStats = courses.map((c) => {
    const total     = c.enrollments.length;
    const completed = c.enrollments.filter((e) => e.completedAt).length;
    const avgProgress = total
      ? Math.round(c.enrollments.reduce((s, e) => s + e.progressPercent, 0) / total)
      : 0;
    const title = c.title as Record<string, string>;
    return {
      id: c.id,
      title: title.en || title.fr || title.rw || "Untitled",
      status: c.status,
      createdAt: c.createdAt,
      totalEnrolled: total,
      completed,
      avgProgress,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    };
  });

  const totalFarmers = new Set(
    courses.flatMap((c) => c.enrollments.map((e) => e.farmerId))
  ).size;

  const totalCompleted = courses.flatMap((c) => c.enrollments).filter((e) => e.completedAt).length;
  const totalEnrolled  = courses.flatMap((c) => c.enrollments).length;

  return NextResponse.json({
    summary: {
      totalCourses:    courses.length,
      publishedCourses: courses.filter((c) => c.status === "PUBLISHED").length,
      totalFarmers,
      totalEnrolled,
      totalCompleted,
      overallCompletion: totalEnrolled ? Math.round((totalCompleted / totalEnrolled) * 100) : 0,
    },
    courseStats,
  });
}
