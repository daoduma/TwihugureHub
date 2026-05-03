// app/api/trainer/lessons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedLesson(lessonId: string, trainerId: string) {
  return db.lesson.findFirst({
    where: { id: lessonId, module: { course: { trainerId } } },
    include: { module: { include: { course: true } }, attachments: true },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await getOwnedLesson(params.id, session.user.id);
  if (!lesson) {
    return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, body: lessonBody, videoUrl, audioUrl, imageUrls, order } = body;

  const updated = await db.lesson.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(lessonBody !== undefined && { body: lessonBody }),
      ...(videoUrl !== undefined && { videoUrl }),
      ...(audioUrl !== undefined && { audioUrl }),
      ...(imageUrls !== undefined && { imageUrls }),
      ...(order !== undefined && { order }),
    },
    include: { attachments: true },
  });

  await db.course.update({ where: { id: lesson.module.courseId }, data: {} });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await getOwnedLesson(params.id, session.user.id);
  if (!lesson) {
    return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
  }

  await db.lesson.delete({ where: { id: params.id } });
  await db.course.update({ where: { id: lesson.module.courseId }, data: {} });
  return NextResponse.json({ success: true, message: "Lesson deleted" });
}
