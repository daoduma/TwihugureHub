// app/api/trainer/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedCourse(courseId: string, trainerId: string) {
  return db.course.findFirst({ where: { id: courseId, trainerId } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const course = await db.course.findFirst({
    where: { id: params.id, trainerId: session.user.id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { attachments: true },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: course });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const course = await getOwnedCourse(params.id, session.user.id);
  if (!course) {
    return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, description, thumbnailUrl, availableLanguages } = body;

  const updated = await db.course.update({
    where: { id: params.id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      ...(availableLanguages !== undefined && { availableLanguages }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const course = await getOwnedCourse(params.id, session.user.id);
  if (!course) {
    return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
  }

  await db.course.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ success: true, message: "Course archived" });
}
