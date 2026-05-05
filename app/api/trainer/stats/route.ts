// app/api/trainer/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const [totalCourses, publishedCourses, pendingApproval, recentCourses, enrolledFarmers] = await Promise.all([
    db.course.count({ where: { trainerId: session.user.id } }),
    db.course.count({ where: { trainerId: session.user.id, status: "PUBLISHED" } }),
    db.course.count({ where: { trainerId: session.user.id, status: "PENDING_APPROVAL" } }),
    db.course.findMany({
      where: { trainerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    db.enrollment.findMany({
      where: { course: { trainerId: session.user.id } },
      select: { farmerId: true },
      distinct: ["farmerId"],
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totalCourses,
      publishedCourses,
      pendingApproval,
      totalEnrolledFarmers: enrolledFarmers.length,
      recentActivity: recentCourses,
    },
  });
}
