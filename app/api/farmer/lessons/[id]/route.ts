// app/api/farmer/lessons/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await db.lesson.findUnique({
    where: { id: params.id },
    include: {
      attachments: true,
      quiz: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: { orderBy: { order: "asc" } },
              feedback: true,
            },
          },
        },
      },
      module: {
        include: {
          course: {
            include: {
              modules: {
                orderBy: { order: "asc" },
                include: {
                  lessons: {
                    orderBy: { order: "asc" },
                    select: { id: true, title: true, order: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Ensure the course is published (farmers can only see published content)
  if (lesson.module.course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course not available" }, { status: 403 });
  }

  return NextResponse.json({ lesson });
}
