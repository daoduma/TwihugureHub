// app/api/trainer/modules/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedModule(moduleId: string, trainerId: string) {
  return db.module.findFirst({
    where: { id: moduleId, course: { trainerId } },
    include: { course: true },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const mod = await getOwnedModule(params.id, session.user.id);
  if (!mod) {
    return NextResponse.json({ success: false, error: "Module not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, order } = body;

  const updated = await db.module.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(order !== undefined && { order }),
    },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  await db.course.update({ where: { id: mod.courseId }, data: {} });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const mod = await getOwnedModule(params.id, session.user.id);
  if (!mod) {
    return NextResponse.json({ success: false, error: "Module not found" }, { status: 404 });
  }

  await db.module.delete({ where: { id: params.id } });
  await db.course.update({ where: { id: mod.courseId }, data: {} });
  return NextResponse.json({ success: true, message: "Module deleted" });
}
