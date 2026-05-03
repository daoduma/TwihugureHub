// app/api/trainer/questions/[id]/translate/route.ts
// CHANGED: Uses getLLMConfig() (DB-first) instead of getLLMConfigFromEnv()
// CHANGED: Notifies trainer when AI translation is ready + audit log
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { translateQuizContent, getLLMConfig, type SupportedLanguage, type TranslationInput } from "@/lib/ai/translationClient";
import { createNotification } from "@/lib/notifications";
import { logAction, AuditActions } from "@/lib/auditLog";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 }, { status: 401 });
  }

  const question = await db.question.findFirst({
    where: { id: params.id, quiz: { lesson: { module: { course: { trainerId: session.user.id } } } } },
    include: { options: { orderBy: { order: "asc" } }, feedback: true, quiz: { include: { lesson: { include: { module: { include: { course: { select: { id: true } } } } } } } } },
  });
  if (!question) return NextResponse.json({ success: false, error: "Question not found", code: "NOT_FOUND", statusCode: 404 }, { status: 404 });

  const { targetLanguage } = await req.json() as { targetLanguage: SupportedLanguage };
  if (!["en", "fr", "rw"].includes(targetLanguage)) {
    return NextResponse.json({ success: false, error: "Invalid target language", code: "VALIDATION_ERROR", statusCode: 400 }, { status: 400 });
  }

  const stemObj = question.stem as Record<string, string>;
  const tsObj = question.translationStatus as Record<string, string>;

  if ((tsObj[targetLanguage] === "MANUAL" || tsObj[targetLanguage] === "AI") && stemObj[targetLanguage]) {
    return NextResponse.json({ success: true, message: "Already translated", data: question });
  }

  // Find source language
  const allLangs: SupportedLanguage[] = ["en", "fr", "rw"];
  let sourceLanguage: SupportedLanguage = "en";
  for (const lang of allLangs) {
    if (lang !== targetLanguage && tsObj[lang] === "MANUAL" && stemObj[lang]) { sourceLanguage = lang; break; }
  }
  if (!stemObj[sourceLanguage]) {
    for (const lang of allLangs) {
      if (lang !== targetLanguage && stemObj[lang]) { sourceLanguage = lang; break; }
    }
  }

  const input: TranslationInput = {
    stem: stemObj as any,
    options: question.options.map((o) => ({ id: o.id, text: o.text as any })),
    correctFeedback: question.feedback?.correctFeedback as any,
    incorrectFeedback: question.feedback?.incorrectFeedback as any,
    sourceLanguage,
  };

  // CHANGED: Use DB config (decrypted) instead of env vars
  const config = await getLLMConfig();
  const result = await translateQuizContent(input, targetLanguage, config);

  // Update question stem
  const newStem = { ...stemObj, [targetLanguage]: result.stem };
  const newTs = { ...tsObj, [targetLanguage]: "AI" };
  await db.question.update({ where: { id: params.id }, data: { stem: newStem, translationStatus: newTs } });

  // Update options
  if (result.options) {
    for (const opt of result.options) {
      const existing = question.options.find((o) => o.id === opt.id);
      if (existing) {
        const newText = { ...(existing.text as Record<string, string>), [targetLanguage]: opt.text };
        await db.answerOption.update({ where: { id: opt.id }, data: { text: newText } });
      }
    }
  }

  // Update feedback
  if (question.feedback && (result.correctFeedback !== undefined || result.incorrectFeedback !== undefined)) {
    const cf = { ...(question.feedback.correctFeedback as Record<string, string>), [targetLanguage]: result.correctFeedback ?? "" };
    const inf = { ...(question.feedback.incorrectFeedback as Record<string, string>), [targetLanguage]: result.incorrectFeedback ?? "" };
    await db.questionFeedback.update({ where: { questionId: params.id }, data: { correctFeedback: cf, incorrectFeedback: inf } });
  }

  // CHANGED: Notify trainer that AI translation is ready
  await createNotification(
    session.user.id, "TRANSLATION_READY", undefined, undefined,
    { type: "question", id: params.id }
  );

  // CHANGED: Audit log
  await logAction(session.user.id, "AI_TRANSLATION", "Question", params.id, { targetLanguage, sourceLanguage });

  const updated = await db.question.findUnique({ where: { id: params.id }, include: { options: true, feedback: true } });
  return NextResponse.json({ success: true, data: updated });
}
