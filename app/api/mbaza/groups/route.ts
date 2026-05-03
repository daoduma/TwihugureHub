// app/api/mbaza/groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await db.farmerGroup.findMany({
    include: {
      createdBy: { select: { name: true } },
      memberships: {
        include: {
          farmer: {
            select: {
              id: true, name: true, email: true,
              enrollments: { select: { progressPercent: true, completedAt: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = groups.map((g) => ({
    ...g,
    farmerCount: g.memberships.length,
    avgProgress: g.memberships.length
      ? Math.round(
          g.memberships.flatMap((m) => m.farmer.enrollments).reduce((s, e) => s + e.progressPercent, 0) /
            Math.max(1, g.memberships.flatMap((m) => m.farmer.enrollments).length)
        )
      : 0,
  }));

  return NextResponse.json({ groups: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, region } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const group = await db.farmerGroup.create({
    data: { name, description, region, createdById: session.user.id },
  });

  return NextResponse.json({ group }, { status: 201 });
}
