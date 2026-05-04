// app/api/trainer/grading/short-answers/[answerId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function PUT(
  req: NextRequest,
  { params }: { params: { answerId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["TRAINER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { answerId } = params;
  const body = await req.json();
  const { manualScore, trainerFeedback, isCorrect } = body as {
    manualScore: number;
    trainerFeedback?: string;
    isCorrect: boolean;
  };

  if (typeof manualScore !== "number" || manualScore < 0 || manualScore > 100) {
    return NextResponse.json({ success: false, error: "manualScore must be 0-100" }, { status: 400 });
  }

  // Verify ownership for trainers
  const answer = await db.quizAnswer.findUnique({
    where: { id: answerId },
    include: {
      attempt: {
        include: {
          quiz: {
            include: {
              lesson: { include: { module: { include: { course: true } } } },
            },
          },
        },
      },
    },
  });

  if (!answer) {
    return NextResponse.json({ success: false, error: "Answer not found" }, { status: 404 });
  }

  if (
    session.user.role === "TRAINER" &&
    answer.attempt.quiz.lesson.module.course.trainerId !== session.user.id
  ) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.quizAnswer.update({
    where: { id: answerId },
    data: {
      manualScore,
      trainerFeedback: trainerFeedback ?? null,
      isCorrect,
      gradingStatus: "MANUALLY_GRADED",
    },
  });

  // Notify the farmer their answer has been graded
  await createNotification(
    answer.attempt.farmerId,
    "SHORT_ANSWER_GRADED",
    undefined,
    {
      en: `Your short answer has been graded. Score: ${manualScore}/100`,
      fr: `Votre réponse courte a été notée. Score: ${manualScore}/100`,
      rw: `Igisubizo cyawe gito cyarangiwe. Amanota: ${manualScore}/100`,
    },
    { type: "quiz_attempt", id: answer.attemptId }
  );

  // Recalculate attempt score based on all answers including this one
  const allAnswers = await db.quizAnswer.findMany({
    where: { attemptId: answer.attemptId },
    include: { question: { select: { type: true } } },
  });

  const totalQ = allAnswers.length;
  let correctCount = 0;
  for (const a of allAnswers) {
    if (a.question.type === "SHORT_ANSWER") {
      // Use manual score if available, treat >= 50 as correct
      if (a.id === answerId) {
        if (isCorrect) correctCount++;
      } else if (a.manualScore !== null && a.manualScore !== undefined) {
        if (a.manualScore >= 50) correctCount++;
      } else if (a.isCorrect) {
        correctCount++;
      }
    } else if (a.isCorrect) {
      correctCount++;
    }
  }

  const newScore = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const quiz = answer.attempt.quiz;
  const newPassed = newScore >= quiz.passingScore;

  await db.quizAttempt.update({
    where: { id: answer.attemptId },
    data: { score: newScore, passed: newPassed },
  });

  return NextResponse.json({ success: true, data: updated, newScore, newPassed });
}

// AI grade endpoint
export async function POST(
  req: NextRequest,
  { params }: { params: { answerId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["TRAINER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { answerId } = params;

  const answer = await db.quizAnswer.findUnique({
    where: { id: answerId },
    include: {
      question: {
        select: {
          id: true,
          stem: true,
          desiredResponse: true,
          aiGrading: true,
        },
      },
      attempt: {
        include: {
          quiz: {
            include: {
              lesson: { include: { module: { include: { course: true } } } },
            },
          },
        },
      },
    },
  });

  if (!answer) {
    return NextResponse.json({ success: false, error: "Answer not found" }, { status: 404 });
  }

  if (!answer.question.aiGrading) {
    return NextResponse.json({ success: false, error: "AI grading not enabled for this question" }, { status: 400 });
  }

  if (!answer.shortAnswerText) {
    return NextResponse.json({ success: false, error: "No answer text to grade" }, { status: 400 });
  }

  // Use LLM to grade the answer
  const { getLLMConfig } = await import("@/lib/ai/translationClient");
  const llmConfig = await getLLMConfig();

  const desiredResponse = answer.question.desiredResponse as Record<string, string> | null;
  const stem = answer.question.stem as Record<string, string>;

  const prompt = `You are an educational grading assistant. Grade the following student answer to a quiz question.

Question: ${stem.en || stem.fr || stem.rw || ""}
Desired/Model Answer: ${desiredResponse?.en || desiredResponse?.fr || desiredResponse?.rw || "No model answer provided"}
Student Answer: ${answer.shortAnswerText}

Please evaluate the student's answer and respond with ONLY a JSON object in this exact format:
{
  "score": <number 0-100>,
  "isCorrect": <boolean, true if score >= 50>,
  "feedback": "<brief explanation of the grade>"
}

Grade fairly based on whether the key concepts from the desired answer are present in the student's response. A score of 0 means completely wrong, 50-70 means partially correct, 80-100 means fully correct.`;

  let aiScore = 0;
  let aiIsCorrect = false;
  let aiFeedback = "";

  try {
    let responseText = "";

    if (llmConfig.provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": llmConfig.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: llmConfig.model,
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await resp.json();
      responseText = data.content?.[0]?.text || "";
    } else if (llmConfig.provider === "openai" || llmConfig.provider === "openai_compatible") {
      const baseUrl = llmConfig.baseUrl || "https://api.openai.com";
      const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.model,
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await resp.json();
      responseText = data.choices?.[0]?.message?.content || "";
    }

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      aiScore = Math.max(0, Math.min(100, Number(parsed.score) || 0));
      aiIsCorrect = parsed.isCorrect ?? aiScore >= 50;
      aiFeedback = parsed.feedback || "";
    }
  } catch (err) {
    console.error("[AI Grading] Error:", err);
    return NextResponse.json({ success: false, error: "AI grading failed" }, { status: 500 });
  }

  const updated = await db.quizAnswer.update({
    where: { id: answerId },
    data: {
      manualScore: aiScore,
      trainerFeedback: aiFeedback,
      isCorrect: aiIsCorrect,
      gradingStatus: "AI_GRADED",
    },
  });

  return NextResponse.json({ success: true, data: updated, aiScore, aiIsCorrect, aiFeedback });
}
