// app/api/trainer/translations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const filterLang = url.searchParams.get("language");
  const filterStatus = url.searchParams.get("status"); // AI | PENDING | MANUAL
  const filterCourse = url.searchParams.get("courseId");

  const questions = await db.question.findMany({
    where: {
      quiz: {
        lesson: {
          module: {
            course: {
              trainerId: session.user.id,
              ...(filterCourse ? { id: filterCourse } : {}),
            },
          },
        },
      },
    },
    include: {
      options: { orderBy: { order: "asc" } },
      feedback: true,
      quiz: {
        include: {
          lesson: {
            include: {
              module: {
                include: { course: { select: { id: true, title: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Flatten into translation items
  type TranslationItem = {
    questionId: string;
    language: string;
    status: string;
    sourceLang: string;
    originalStem: string;
    translatedStem: string;
    courseId: string;
    courseTitle: Record<string, string>;
    quizId: string;
  };

  const items: TranslationItem[] = [];

  for (const q of questions) {
    const stemObj = q.stem as Record<string, string>;
    const tsObj = q.translationStatus as Record<string, string>;
    const courseData = q.quiz.lesson.module.course;

    for (const lang of ["en", "fr", "rw"]) {
      const status = tsObj[lang] ?? "PENDING";
      if (filterLang && filterLang !== lang) continue;
      if (filterStatus && filterStatus !== status) continue;
      if (status === "PENDING" && !stemObj[lang]) continue; // no content yet

      // Find source language: prefer MANUAL-approved, then any lang with content,
      // only fall back to "en" as last resort (avoids blank "Original" column)
      const sourceLang =
        ["en", "fr", "rw"].find((l) => l !== lang && tsObj[l] === "MANUAL" && stemObj[l]) ??
        ["en", "fr", "rw"].find((l) => l !== lang && stemObj[l]) ??
        "en";

      items.push({
        questionId: q.id,
        language: lang,
        status,
        sourceLang,
        originalStem: stemObj[sourceLang] ?? "",
        translatedStem: stemObj[lang] ?? "",
        courseId: courseData.id,
        courseTitle: courseData.title as Record<string, string>,
        quizId: q.quizId,
      });
    }
  }

  return NextResponse.json({ success: true, data: items });
}
