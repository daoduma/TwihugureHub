// app/api/trainer/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const courses = await db.course.findMany({
    where: { trainerId: session.user.id },
    include: {
      _count: { select: { modules: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: courses });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, thumbnailUrl, availableLanguages } = body;

  if (!title) {
    return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
  }

  const course = await db.course.create({
    data: {
      title: title ?? { en: "", fr: "", rw: "" },
      description: description ?? { en: "", fr: "", rw: "" },
      thumbnailUrl: thumbnailUrl ?? null,
      availableLanguages: availableLanguages ?? [],
      trainerId: session.user.id,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ success: true, data: course }, { status: 201 });
}
