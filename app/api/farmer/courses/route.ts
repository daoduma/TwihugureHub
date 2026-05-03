// app/api/farmer/courses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmerId = session.user.id;

  const [enrollments, publishedCourses] = await Promise.all([
    db.enrollment.findMany({
      where: { farmerId },
      include: {
        course: {
          include: {
            modules: { include: { lessons: { select: { id: true } } } },
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        modules: { include: { lessons: { select: { id: true } } } },
        _count: { select: { modules: true } },
      },
    }),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const recommended = publishedCourses.filter((c) => !enrolledCourseIds.has(c.id));

  return NextResponse.json({ enrollments, recommended });
}
