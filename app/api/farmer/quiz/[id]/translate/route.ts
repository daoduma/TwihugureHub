// app/api/farmer/quiz/[id]/translate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { translateQuizContent, getLLMConfigFromEnv } from "@/lib/ai/translationClient";
import type { SupportedLanguage } from "@/lib/ai/translationClient";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quizId = params.id;
  const body = await req.json();
  const targetLang: SupportedLanguage = body.language || session.user.preferredLanguage || "en";

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } }, feedback: true },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const config = getLLMConfigFromEnv();
  const results = [];

  for (const question of quiz.questions) {
    const stem = question.stem as Record<string, string>;
    const translationStatus = question.translationStatus as Record<string, string>;

    // Check if we already have a translation
    if (stem[targetLang] && stem[targetLang].trim() !== "" && translationStatus[targetLang] !== "PENDING") {
      results.push({ questionId: question.id, cached: true });
      continue;
    }

    // Determine source language (pick the best available)
    const sourceLang: SupportedLanguage =
      stem["en"] ? "en" : stem["fr"] ? "fr" : stem["rw"] ? "rw" : "en";

    const options = question.options as Array<{ id: string; text: Record<string, string>; isCorrect: boolean; order: number }>;
    const feedback = question.feedback as { correctFeedback: Record<string, string>; incorrectFeedback: Record<string, string> } | null;

    try {
      const translation = await translateQuizContent(
        {
          stem: { en: stem["en"] || "", fr: stem["fr"] || "", rw: stem["rw"] || "" },
          options: options.map((o) => ({
            id: o.id,
            text: { en: (o.text as Record<string, string>)["en"] || "", fr: (o.text as Record<string, string>)["fr"] || "", rw: (o.text as Record<string, string>)["rw"] || "" },
          })),
          correctFeedback: feedback
            ? { en: feedback.correctFeedback["en"] || "", fr: feedback.correctFeedback["fr"] || "", rw: feedback.correctFeedback["rw"] || "" }
            : undefined,
          incorrectFeedback: feedback
            ? { en: feedback.incorrectFeedback["en"] || "", fr: feedback.incorrectFeedback["fr"] || "", rw: feedback.incorrectFeedback["rw"] || "" }
            : undefined,
          sourceLanguage: sourceLang,
        },
        targetLang,
        config
      );

      // Save translation back to DB
      const updatedStem = { ...stem, [targetLang]: translation.stem };
      const updatedStatus = { ...translationStatus, [targetLang]: "AI" };

      await db.question.update({
        where: { id: question.id },
        data: { stem: updatedStem, translationStatus: updatedStatus },
      });

      if (translation.options) {
        for (const opt of translation.options) {
          const dbOpt = options.find((o) => o.id === opt.id);
          if (dbOpt) {
            const updatedText = { ...(dbOpt.text as Record<string, string>), [targetLang]: opt.text };
            await db.answerOption.update({ where: { id: opt.id }, data: { text: updatedText } });
          }
        }
      }

      if (feedback && (translation.correctFeedback !== undefined || translation.incorrectFeedback !== undefined)) {
        const updatedCorrect = { ...feedback.correctFeedback, [targetLang]: translation.correctFeedback || "" };
        const updatedIncorrect = { ...feedback.incorrectFeedback, [targetLang]: translation.incorrectFeedback || "" };
        await db.questionFeedback.update({
          where: { questionId: question.id },
          data: { correctFeedback: updatedCorrect, incorrectFeedback: updatedIncorrect },
        });
      }

      results.push({ questionId: question.id, translated: true });
    } catch (err) {
      console.error("Translation error for question", question.id, err);
      results.push({ questionId: question.id, error: true });
    }
  }

  // Re-fetch the quiz with updated translations
  const updatedQuiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } }, feedback: true },
      },
    },
  });

  return NextResponse.json({ quiz: updatedQuiz, results });
}
