// __tests__/integration/llm-validate.test.ts
// NEW: Integration test for POST /api/admin/llm/validate
jest.mock("@/lib/db", () => ({
  db: {
    lLMConfig: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  },
}));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/crypto", () => ({ decryptApiKey: jest.fn((k: string) => k), encryptApiKey: jest.fn((k: string) => `enc:${k}`) }));

import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

const mockGetSession = getServerSession as jest.Mock;

// We test the validate route logic: it should call the LLM provider and mark config as validated
describe("POST /api/admin/llm/validate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    global.fetch = jest.fn();
  });

  test("returns 403 for non-admin users", async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: "farmer1", role: "FARMER" } });
    const { POST } = await import("@/app/api/admin/llm/validate/route");
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ provider: "anthropic", apiKey: "sk-test", modelId: "claude-sonnet-4-20250514" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
