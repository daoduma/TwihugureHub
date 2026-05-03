// app/api/mbaza/interventions/route.ts
// CHANGED: Added notification to mbaza staff on flag creation + audit log
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logAction, AuditActions } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const resolved = searchParams.get("resolved") === "true";
  const flags = await db.interventionFlag.findMany({
    where: { isResolved: resolved },
    include: {
      farmer: { select: { id: true, name: true, email: true, preferredLanguage: true } },
      course: { select: { id: true, title: true } },
      resolvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ flags });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }
  const body = await req.json();
  const { farmerId, flagType, courseId, notes } = body;

  if (!farmerId || !flagType) {
    return NextResponse.json({ error: "farmerId and flagType are required", code: "VALIDATION_ERROR", statusCode: 400 }, { status: 400 });
  }

  const flag = await db.interventionFlag.create({
    data: { farmerId, flagType, courseId: courseId ?? null, notes: notes ?? null },
    include: { farmer: { select: { name: true } } },
  });

  // CHANGED: Notify all mbaza staff of new intervention flag
  const mbazaStaff = await db.user.findMany({ where: { role: "MBAZA_STAFF", isActive: true }, select: { id: true } });
  await Promise.all(
    mbazaStaff.map((s) =>
      createNotification(s.id, "INTERVENTION_FLAG", undefined, undefined, { type: "InterventionFlag", id: flag.id })
    )
  );

  // CHANGED: Audit log
  await logAction(session.user.id, AuditActions.FLAG_CREATED, "InterventionFlag", flag.id, { farmerId, flagType, courseId });

  return NextResponse.json({ flag }, { status: 201 });
}
