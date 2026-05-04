// app/api/trainer/lessons/[id]/attachments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedLesson(lessonId: string, trainerId: string) {
  return db.lesson.findFirst({
    where: { id: lessonId, module: { course: { trainerId } } },
  });
}

// POST /api/trainer/lessons/[id]/attachments — add a new attachment
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await getOwnedLesson(params.id, session.user.id);
  if (!lesson) {
    return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
  }

  const body = await req.json();
  const { fileUrl, fileName, fileType } = body;

  if (!fileUrl || !fileName || !fileType) {
    return NextResponse.json({ success: false, error: "fileUrl, fileName, and fileType are required" }, { status: 400 });
  }

  const attachment = await db.lessonAttachment.create({
    data: { lessonId: params.id, fileUrl, fileName, fileType },
  });

  return NextResponse.json({ success: true, data: attachment }, { status: 201 });
}

// DELETE /api/trainer/lessons/[id]/attachments?attachmentId=... — remove an attachment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await getOwnedLesson(params.id, session.user.id);
  if (!lesson) {
    return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId) {
    return NextResponse.json({ success: false, error: "attachmentId query param is required" }, { status: 400 });
  }

  const existing = await db.lessonAttachment.findFirst({
    where: { id: attachmentId, lessonId: params.id },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Attachment not found" }, { status: 404 });
  }

  await db.lessonAttachment.delete({ where: { id: attachmentId } });
  return NextResponse.json({ success: true, message: "Attachment deleted" });
}
