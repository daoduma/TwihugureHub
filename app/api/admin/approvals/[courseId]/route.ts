// app/api/admin/approvals/[courseId]/route.ts
// CHANGED: Added audit logging for course approval/rejection
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction, AuditActions } from "@/lib/auditLog";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: { courseId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }

  const body = await req.json();
  const { decision, notes } = body as { decision: "APPROVED" | "REJECTED"; notes?: string };

  if (!["APPROVED", "REJECTED"].includes(decision)) {
    return NextResponse.json({ error: "decision must be APPROVED or REJECTED", code: "VALIDATION_ERROR", statusCode: 400 }, { status: 400 });
  }

  const course = await db.course.findUnique({ where: { id: params.courseId } });
  if (!course) return NextResponse.json({ error: "Course not found", code: "NOT_FOUND", statusCode: 404 }, { status: 404 });

  const newStatus = decision === "APPROVED" ? "PUBLISHED" : "DRAFT";

  await db.$transaction([
    db.course.update({ where: { id: params.courseId }, data: { status: newStatus } }),
    db.courseApproval.create({ data: { courseId: params.courseId, reviewedById: session.user.id, decision, notes: notes ?? "" } }),
  ]);

  // CHANGED: Audit log for approval/rejection
  await logAction(
    session.user.id,
    decision === "APPROVED" ? AuditActions.COURSE_APPROVED : AuditActions.COURSE_REJECTED,
    "Course",
    params.courseId,
    { decision, notes, previousStatus: course.status }
  );

  // Notify the trainer
  await createNotification(
    course.trainerId,
    decision === "APPROVED" ? "COURSE_APPROVED" : "COURSE_REJECTED",
    undefined, undefined,
    { type: "course", id: params.courseId }
  );

  return NextResponse.json({ success: true, newStatus });
}
