// app/api/mbaza/farmers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? "";
  const groupId = searchParams.get("groupId") ?? "";
  const flagged = searchParams.get("flagged") ?? "";
  const minCompletion = searchParams.get("minCompletion") ?? "";
  const maxCompletion = searchParams.get("maxCompletion") ?? "";

  // If filtering by group, first get farmer IDs
  let groupFarmerIds: string[] | undefined;
  if (groupId) {
    const memberships = await db.farmerGroupMembership.findMany({
      where: { groupId },
      select: { farmerId: true },
    });
    groupFarmerIds = memberships.map((m) => m.farmerId);
  }

  const where: Record<string, unknown> = {
    role: "FARMER",
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (groupFarmerIds) {
    where.id = { in: groupFarmerIds };
  }

  if (flagged === "yes") {
    where.interventionFlags = { some: { isResolved: false } };
  } else if (flagged === "no") {
    where.interventionFlags = { none: { isResolved: false } };
  }

  const farmers = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      preferredLanguage: true,
      createdAt: true,
      sessions: { orderBy: { expires: "desc" }, take: 1, select: { expires: true } },
      enrollments: {
        select: { progressPercent: true, completedAt: true, courseId: true },
      },
      quizAttempts: { select: { score: true } },
      interventionFlags: { where: { isResolved: false }, select: { id: true, flagType: true } },
      groupMemberships: {
        include: { group: { select: { name: true, region: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Compute stats per farmer
  let processed = farmers.map((f) => {
    const enrollCount = f.enrollments.length;
    const completed = f.enrollments.filter((e) => e.completedAt).length;
    const avgProgress = enrollCount
      ? Math.round(f.enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollCount)
      : 0;
    const avgScore = f.quizAttempts.length
      ? Math.round(f.quizAttempts.reduce((s, a) => s + a.score, 0) / f.quizAttempts.length)
      : null;
    const lastActive = f.sessions[0]?.expires ?? null;
    const groups = f.groupMemberships.map((m) => m.group.name).join(", ");

    return {
      id: f.id,
      name: f.name,
      email: f.email,
      preferredLanguage: f.preferredLanguage,
      createdAt: f.createdAt,
      groups,
      enrollCount,
      completed,
      avgProgress,
      avgScore,
      lastActive,
      flagCount: f.interventionFlags.length,
      flags: f.interventionFlags.map((fl) => fl.flagType),
    };
  });

  // Filter by completion range
  if (minCompletion) processed = processed.filter((f) => f.avgProgress >= parseInt(minCompletion));
  if (maxCompletion) processed = processed.filter((f) => f.avgProgress <= parseInt(maxCompletion));

  const total = processed.length;
  const paginated = processed.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ farmers: paginated, total, page, limit });
}
