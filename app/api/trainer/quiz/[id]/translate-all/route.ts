// app/api/trainer/quiz/[id]/translate-all/route.ts
// Uses Server-Sent Events to stream progress back to the client
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  translateQuizContent,
  getLLMConfigFromEnv,
  type SupportedLanguage,
  type TranslationInput,
} from "@/lib/ai/translationClient";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
  }

  const quiz = await db.quiz.findFirst({
    where: { id: params.id, lesson: { module: { course: { trainerId: session.user.id } } } },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } }, feedback: true },
      },
    },
  });
  if (!quiz) {
    return new Response(JSON.stringify({ success: false, error: "Quiz not found" }), { status: 404 });
  }

  const { targetLanguage } = await req.json() as { targetLanguage: SupportedLanguage };
  if (!["en", "fr", "rw"].includes(targetLanguage)) {
    return new Response(JSON.stringify({ success: false, error: "Invalid target language" }), { status: 400 });
  }

  const config = getLLMConfigFromEnv();
  const questions = quiz.questions;
  const total = questions.length;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "start", total, targetLanguage });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const stemObj = q.stem as Record<string, string>;
        const tsObj = q.translationStatus as Record<string, string>;

        // Skip already translated
        if ((tsObj[targetLanguage] === "MANUAL" || tsObj[targetLanguage] === "AI") && stemObj[targetLanguage]) {
          send({ type: "skip", questionId: q.id, index: i, total, reason: "already_translated" });
          continue;
        }

        const sourceLang = (["en", "fr", "rw"] as SupportedLanguage[]).find(
          (l) => l !== targetLanguage && tsObj[l] === "MANUAL" && stemObj[l]
        ) ?? (["en", "fr", "rw"] as SupportedLanguage[]).find(
          (l) => l !== targetLanguage && stemObj[l]
        ) ?? "en";

        const input: TranslationInput = {
          sourceLanguage: sourceLang,
          stem: q.stem as { en: string; fr: string; rw: string },
          options: (q.options as { id: string; text: Record<string, string> }[]).map((o) => ({
            id: o.id,
            text: o.text as { en: string; fr: string; rw: string },
          })),
          correctFeedback: q.feedback?.correctFeedback as { en: string; fr: string; rw: string } | undefined,
          incorrectFeedback: q.feedback?.incorrectFeedback as { en: string; fr: string; rw: string } | undefined,
        };

        try {
          send({ type: "progress", questionId: q.id, index: i, total, status: "translating" });

          const result = await translateQuizContent(input, targetLanguage, config);

          // Save stem
          await db.question.update({
            where: { id: q.id },
            data: {
              stem: { ...stemObj, [targetLanguage]: result.stem },
              translationStatus: { ...tsObj, [targetLanguage]: "AI" },
            },
          });

          // Save options
          if (result.options) {
            for (const opt of result.options) {
              const existing = q.options.find((o: { id: string }) => o.id === opt.id);
              if (existing) {
                const newText = { ...(existing.text as Record<string, string>), [targetLanguage]: opt.text };
                await db.answerOption.update({ where: { id: opt.id }, data: { text: newText } });
              }
            }
          }

          // Save feedback
          if (q.feedback) {
            const cfObj = q.feedback.correctFeedback as Record<string, string>;
            const ifObj = q.feedback.incorrectFeedback as Record<string, string>;
            await db.questionFeedback.update({
              where: { questionId: q.id },
              data: {
                correctFeedback: { ...cfObj, [targetLanguage]: result.correctFeedback ?? "" },
                incorrectFeedback: { ...ifObj, [targetLanguage]: result.incorrectFeedback ?? "" },
              },
            });
          }

          send({ type: "done", questionId: q.id, index: i, total, status: "translated" });
        } catch (err) {
          send({
            type: "error",
            questionId: q.id,
            index: i,
            total,
            error: err instanceof Error ? err.message : "Translation failed",
          });
        }
      }

      send({ type: "complete", total });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
