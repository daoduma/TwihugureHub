// app/api/trainer/courses/[id]/modules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const course = await db.course.findFirst({ where: { id: params.id, trainerId: session.user.id } });
  if (!course) {
    return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, order } = body;

  // Get max order if not provided
  let moduleOrder = order;
  if (moduleOrder === undefined) {
    const maxModule = await db.module.findFirst({
      where: { courseId: params.id },
      orderBy: { order: "desc" },
    });
    moduleOrder = (maxModule?.order ?? -1) + 1;
  }

  const module = await db.module.create({
    data: {
      courseId: params.id,
      title: title ?? { en: "New Module", fr: "Nouveau module", rw: "Igice gishya" },
      order: moduleOrder,
    },
    include: { lessons: true },
  });

  // Touch course updatedAt
  await db.course.update({ where: { id: params.id }, data: {} });

  return NextResponse.json({ success: true, data: module }, { status: 201 });
}
