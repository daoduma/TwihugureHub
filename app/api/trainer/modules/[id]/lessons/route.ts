// app/api/trainer/modules/[id]/lessons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const mod = await db.module.findFirst({
    where: { id: params.id, course: { trainerId: session.user.id } },
  });
  if (!mod) {
    return NextResponse.json({ success: false, error: "Module not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, order } = body;

  let lessonOrder = order;
  if (lessonOrder === undefined) {
    const maxLesson = await db.lesson.findFirst({
      where: { moduleId: params.id },
      orderBy: { order: "desc" },
    });
    lessonOrder = (maxLesson?.order ?? -1) + 1;
  }

  const lesson = await db.lesson.create({
    data: {
      moduleId: params.id,
      title: title ?? { en: "New Lesson", fr: "Nouvelle leçon", rw: "Isomo rishya" },
      body: { en: "", fr: "", rw: "" },
      imageUrls: [],
      order: lessonOrder,
    },
    include: { attachments: true },
  });

  await db.course.update({ where: { id: mod.courseId }, data: {} });
  return NextResponse.json({ success: true, data: lesson }, { status: 201 });
}
