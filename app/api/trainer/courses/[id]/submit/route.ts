// app/api/trainer/courses/[id]/submit/route.ts
// CHANGED: Added notification to admin on course submission + audit log
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logAction, AuditActions } from "@/lib/auditLog";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 }, { status: 401 });
  }

  const course = await db.course.findFirst({ where: { id: params.id, trainerId: session.user.id } });
  if (!course) {
    return NextResponse.json({ error: "Course not found", code: "NOT_FOUND", statusCode: 404 }, { status: 404 });
  }
  if (course.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT courses can be submitted for approval", code: "INVALID_STATE", statusCode: 400 },
      { status: 400 }
    );
  }

  const updated = await db.course.update({ where: { id: params.id }, data: { status: "PENDING_APPROVAL" } });

  // CHANGED: Notify all admins that a course was submitted for review
  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createNotification(
        a.id,
        "SYSTEM_ANNOUNCEMENT",
        { en: "Course Submitted for Review", fr: "Cours soumis pour révision", rw: "Isomo ryoherejwe ku isuzumwa" },
        { en: "A trainer has submitted a course for your approval.", fr: "Un formateur a soumis un cours pour approbation.", rw: "Umwarimu yohereje isomo kugirango uryemeze." },
        { type: "Course", id: params.id }
      )
    )
  );

  // CHANGED: Audit log for course submission
  await logAction(session.user.id, AuditActions.COURSE_SUBMITTED, "Course", params.id, {
    title: course.title,
    previousStatus: "DRAFT",
    newStatus: "PENDING_APPROVAL",
  });

  return NextResponse.json({ success: true, data: updated });
}
