// app/api/admin/approvals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const courses = await db.course.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      trainer: { select: { id: true, name: true, email: true } },
      modules: {
        include: {
          lessons: {
            include: {
              quiz: { include: { questions: true } },
              attachments: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  return NextResponse.json({ courses });
}
