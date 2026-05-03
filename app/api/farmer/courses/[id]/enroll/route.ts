// app/api/farmer/courses/[id]/enroll/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmerId = session.user.id;
  const courseId = params.id;

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course not available" }, { status: 404 });
  }

  const existing = await db.enrollment.findUnique({
    where: { farmerId_courseId: { farmerId, courseId } },
  });

  const enrollment = await db.enrollment.upsert({
    where: { farmerId_courseId: { farmerId, courseId } },
    update: {},
    create: { farmerId, courseId },
  });

  // Only send notification on new enrollment
  if (!existing) {
    await createNotification(farmerId, "COURSE_ENROLLED", undefined, undefined, {
      type: "course",
      id: courseId,
    });
  }

  return NextResponse.json({ enrollment });
}
