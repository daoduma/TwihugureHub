// __tests__/unit/quizScoring.test.ts
// NEW: Unit tests for quiz score calculation logic
// Mirrors the scoring logic in /app/api/farmer/quiz/[id]/attempt/route.ts

interface Question {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: Array<{ id: string; isCorrect: boolean }>;
}

interface Answer {
  questionId: string;
  selectedOptionId?: string;
  shortAnswerText?: string;
}

function calculateScore(questions: Question[], answers: Answer[], passingScore: number) {
  let correctCount = 0;
  const results = [];

  for (const q of questions) {
    const userAnswer = answers.find((a) => a.questionId === q.id);
    let isCorrect = false;

    if (q.type === "SHORT_ANSWER") {
      isCorrect = true; // Manual review
    } else if (userAnswer?.selectedOptionId) {
      const opt = q.options.find((o) => o.id === userAnswer.selectedOptionId);
      isCorrect = opt?.isCorrect ?? false;
    }

    if (isCorrect) correctCount++;
    results.push({ questionId: q.id, isCorrect });
  }

  const total = questions.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = score >= passingScore;

  return { score, passed, correctCount, total, results };
}

describe("Quiz scoring", () => {
  const questions: Question[] = [
    { id: "q1", type: "MULTIPLE_CHOICE", options: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: false }] },
    { id: "q2", type: "MULTIPLE_CHOICE", options: [{ id: "c", isCorrect: false }, { id: "d", isCorrect: true }] },
    { id: "q3", type: "MULTIPLE_CHOICE", options: [{ id: "e", isCorrect: true }, { id: "f", isCorrect: false }] },
  ];

  test("100% score when all answers correct", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "a" },
      { questionId: "q2", selectedOptionId: "d" },
      { questionId: "q3", selectedOptionId: "e" },
    ];
    const { score, passed, correctCount } = calculateScore(questions, answers, 70);
    expect(score).toBe(100);
    expect(passed).toBe(true);
    expect(correctCount).toBe(3);
  });

  test("0% score when all answers wrong", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "b" },
      { questionId: "q2", selectedOptionId: "c" },
      { questionId: "q3", selectedOptionId: "f" },
    ];
    const { score, passed } = calculateScore(questions, answers, 70);
    expect(score).toBe(0);
    expect(passed).toBe(false);
  });

  test("33% score for 1 correct out of 3", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "a" }, // correct
      { questionId: "q2", selectedOptionId: "c" }, // wrong
      { questionId: "q3", selectedOptionId: "f" }, // wrong
    ];
    const { score, passed } = calculateScore(questions, answers, 70);
    expect(score).toBe(33);
    expect(passed).toBe(false);
  });

  test("67% score for 2 correct out of 3", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "a" }, // correct
      { questionId: "q2", selectedOptionId: "d" }, // correct
      { questionId: "q3", selectedOptionId: "f" }, // wrong
    ];
    const { score, passed } = calculateScore(questions, answers, 70);
    expect(score).toBe(67);
    expect(passed).toBe(false); // 67 < 70
  });

  test("passes at exactly passing score", () => {
    const qs: Question[] = [
      { id: "q1", type: "MULTIPLE_CHOICE", options: [{ id: "a", isCorrect: true }] },
      { id: "q2", type: "MULTIPLE_CHOICE", options: [{ id: "b", isCorrect: true }] },
      { id: "q3", type: "MULTIPLE_CHOICE", options: [{ id: "c", isCorrect: true }] },
      { id: "q4", type: "MULTIPLE_CHOICE", options: [{ id: "d", isCorrect: true }, { id: "e", isCorrect: false }] },
      { id: "q5", type: "MULTIPLE_CHOICE", options: [{ id: "f", isCorrect: true }, { id: "g", isCorrect: false }] },
      { id: "q6", type: "MULTIPLE_CHOICE", options: [{ id: "h", isCorrect: true }, { id: "i", isCorrect: false }] },
      { id: "q7", type: "MULTIPLE_CHOICE", options: [{ id: "j", isCorrect: false }, { id: "k", isCorrect: true }] },
      { id: "q8", type: "MULTIPLE_CHOICE", options: [{ id: "l", isCorrect: false }] },
      { id: "q9", type: "MULTIPLE_CHOICE", options: [{ id: "m", isCorrect: false }] },
      { id: "q10", type: "MULTIPLE_CHOICE", options: [{ id: "n", isCorrect: false }] },
    ];
    // 7 correct out of 10 = 70%
    const answers = [
      { questionId: "q1", selectedOptionId: "a" },
      { questionId: "q2", selectedOptionId: "b" },
      { questionId: "q3", selectedOptionId: "c" },
      { questionId: "q4", selectedOptionId: "d" },
      { questionId: "q5", selectedOptionId: "f" },
      { questionId: "q6", selectedOptionId: "h" },
      { questionId: "q7", selectedOptionId: "k" },
      { questionId: "q8", selectedOptionId: "l" },
      { questionId: "q9", selectedOptionId: "m" },
      { questionId: "q10", selectedOptionId: "n" },
    ];
    const { score, passed } = calculateScore(qs, answers, 70);
    expect(score).toBe(70);
    expect(passed).toBe(true);
  });

  test("short answer questions always count as correct", () => {
    const qs: Question[] = [
      { id: "q1", type: "SHORT_ANSWER", options: [] },
      { id: "q2", type: "MULTIPLE_CHOICE", options: [{ id: "a", isCorrect: false }] },
    ];
    const answers = [
      { questionId: "q1", shortAnswerText: "some answer" },
      { questionId: "q2", selectedOptionId: "a" },
    ];
    const { score, correctCount } = calculateScore(qs, answers, 70);
    expect(correctCount).toBe(1); // only short answer
    expect(score).toBe(50);
  });

  test("0% score with empty questions list", () => {
    const { score } = calculateScore([], [], 70);
    expect(score).toBe(0);
  });

  test("unanswered questions count as incorrect", () => {
    const answers: Answer[] = [{ questionId: "q1", selectedOptionId: "a" }]; // q2, q3 skipped
    const { score, correctCount } = calculateScore(questions, answers, 70);
    expect(correctCount).toBe(1);
    expect(score).toBe(33);
  });
});
