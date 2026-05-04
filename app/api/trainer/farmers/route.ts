// app/api/trainer/farmers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page   = parseInt(searchParams.get("page")  ?? "1");
  const limit  = parseInt(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? "";

  const trainerCourses = await db.course.findMany({
    where: { trainerId: session.user.id },
    select: { id: true, title: true },
  });
  const courseIds = trainerCourses.map((c) => c.id);

  if (courseIds.length === 0) {
    return NextResponse.json({ farmers: [], total: 0, page, limit });
  }

  const enrollments = await db.enrollment.findMany({
    where: { courseId: { in: courseIds } },
    select: { farmerId: true },
    distinct: ["farmerId"],
  });
  let farmerIds = enrollments.map((e) => e.farmerId);

  if (farmerIds.length === 0) {
    return NextResponse.json({ farmers: [], total: 0, page, limit });
  }

  if (search) {
    const matched = await db.user.findMany({
      where: {
        id: { in: farmerIds },
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    farmerIds = matched.map((u) => u.id);
  }

  const farmers = await db.user.findMany({
    where: { id: { in: farmerIds }, role: "FARMER", isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      preferredLanguage: true,
      sessions: { orderBy: { expires: "desc" }, take: 1, select: { expires: true } },
      enrollments: {
        where: { courseId: { in: courseIds } },
        select: {
          progressPercent: true,
          completedAt: true,
          course: { select: { id: true, title: true } },
        },
      },
      quizAttempts: {
        where: { quiz: { lesson: { module: { course: { trainerId: session.user.id } } } } },
        select: { score: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const processed = farmers.map((f) => {
    const enrollCount = f.enrollments.length;
    const completed   = f.enrollments.filter((e) => e.completedAt).length;
    const avgProgress = enrollCount
      ? Math.round(f.enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollCount)
      : 0;
    const avgScore = f.quizAttempts.length
      ? Math.round(f.quizAttempts.reduce((s, a) => s + a.score, 0) / f.quizAttempts.length)
      : null;
    const lastActive = f.sessions[0]?.expires ?? null;
    const courses = f.enrollments.map((e) => {
      const t = e.course.title as Record<string, string>;
      return t.en || t.fr || t.rw || "Untitled";
    });
    return { id: f.id, name: f.name, email: f.email, preferredLanguage: f.preferredLanguage, enrollCount, completed, avgProgress, avgScore, lastActive, courses };
  });

  const total     = processed.length;
  const paginated = processed.slice((page - 1) * limit, page * limit);
  return NextResponse.json({ farmers: paginated, total, page, limit });
}
