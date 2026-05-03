// __tests__/integration/quiz-attempt.test.ts
// NEW: Integration test for POST /api/farmer/quiz/[id]/attempt
// Uses Next.js route handler testing pattern
import { NextRequest } from "next/server";

// Mock Prisma, auth, notifications, and certificates
jest.mock("@/lib/db", () => ({
  db: {
    quiz: { findUnique: jest.fn() },
    quizAttempt: { count: jest.fn(), create: jest.fn() },
    lessonProgress: { upsert: jest.fn(), count: jest.fn() },
    enrollment: { findFirst: jest.fn(), updateMany: jest.fn() },
  },
}));

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/notifications", () => ({ createNotification: jest.fn() }));
jest.mock("@/lib/certificates", () => ({ maybeIssueCertificate: jest.fn() }));
jest.mock("@/lib/auditLog", () => ({
  logAction: jest.fn(),
  AuditActions: { QUIZ_PASSED: "QUIZ_PASSED", QUIZ_FAILED: "QUIZ_FAILED" },
}));

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { POST } from "@/app/api/farmer/quiz/[id]/attempt/route";

const mockDb = db as jest.Mocked<typeof db>;
const mockGetSession = getServerSession as jest.Mock;

const buildQuiz = (passingScore = 70) => ({
  id: "quiz1",
  lessonId: "lesson1",
  passingScore,
  questions: [
    { id: "q1", type: "MULTIPLE_CHOICE", options: [{ id: "opt1", isCorrect: true }, { id: "opt2", isCorrect: false }] },
    { id: "q2", type: "MULTIPLE_CHOICE", options: [{ id: "opt3", isCorrect: true }, { id: "opt4", isCorrect: false }] },
  ],
  lesson: { module: { courseId: "course1", course: { modules: [{ lessons: [{ id: "lesson1" }] }] } } },
});

describe("POST /api/farmer/quiz/[id]/attempt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "farmer1" } });
    (mockDb.quiz.findUnique as jest.Mock).mockResolvedValue(buildQuiz());
    (mockDb.quizAttempt.count as jest.Mock).mockResolvedValue(0);
    (mockDb.quizAttempt.create as jest.Mock).mockResolvedValue({ id: "attempt1", answers: [] });
    (mockDb.lessonProgress.count as jest.Mock).mockResolvedValue(0);
    (mockDb.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "enroll1" });
  });

  const makeRequest = (answers: any[]) =>
    new NextRequest("http://localhost/api/farmer/quiz/quiz1/attempt", {
      method: "POST",
      body: JSON.stringify({ answers, languageUsed: "en", startedAt: new Date().toISOString() }),
      headers: { "Content-Type": "application/json" },
    });

  test("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await POST(makeRequest([]), { params: { id: "quiz1" } });
    expect(res.status).toBe(401);
  });

  test("returns 404 when quiz not found", async () => {
    (mockDb.quiz.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(makeRequest([]), { params: { id: "quiz1" } });
    expect(res.status).toBe(404);
  });

  test("calculates correct score for perfect answers", async () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "opt1" },
      { questionId: "q2", selectedOptionId: "opt3" },
    ];
    const res = await POST(makeRequest(answers), { params: { id: "quiz1" } });
    const data = await res.json();
    expect(data.score).toBe(100);
    expect(data.passed).toBe(true);
    expect(data.correctCount).toBe(2);
  });

  test("calculates correct score for all wrong answers", async () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "opt2" },
      { questionId: "q2", selectedOptionId: "opt4" },
    ];
    const res = await POST(makeRequest(answers), { params: { id: "quiz1" } });
    const data = await res.json();
    expect(data.score).toBe(0);
    expect(data.passed).toBe(false);
  });
});
