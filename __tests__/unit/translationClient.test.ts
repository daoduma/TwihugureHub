// __tests__/unit/translationClient.test.ts
// NEW: Unit tests for translation client — mocks API call, verifies prompt format
import { translateQuizContent, getLLMConfigFromEnv } from "@/lib/ai/translationClient";
import type { TranslationInput, LLMConfig } from "@/lib/ai/translationClient";

// Mock global fetch
global.fetch = jest.fn();

describe("translationClient", () => {
  const mockConfig: LLMConfig = {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: "sk-ant-test",
  };

  const input: TranslationInput = {
    stem: { en: "Which soil retains water best?", fr: "", rw: "" },
    options: [
      { id: "opt1", text: { en: "Sandy soil", fr: "", rw: "" } },
      { id: "opt2", text: { en: "Clay soil", fr: "", rw: "" } },
    ],
    correctFeedback: { en: "Correct!", fr: "", rw: "" },
    incorrectFeedback: { en: "Try again.", fr: "", rw: "" },
    sourceLanguage: "en",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls Anthropic API with correct structure", async () => {
    const mockResponse = {
      stem: "Quel sol retient le mieux l'eau?",
      options: [
        { id: "opt1", text: "Sol sableux" },
        { id: "opt2", text: "Sol argileux" },
      ],
      correctFeedback: "Correct!",
      incorrectFeedback: "Réessayez.",
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: JSON.stringify(mockResponse) }] }),
    });

    const result = await translateQuizContent(input, "fr", mockConfig);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "sk-ant-test",
          "anthropic-version": "2023-06-01",
        }),
      })
    );

    expect(result.stem).toBe("Quel sol retient le mieux l'eau?");
    expect(result.options).toHaveLength(2);
    expect(result.options![0].id).toBe("opt1");
  });

  test("prompt contains agricultural context and language names", async () => {
    let capturedBody: any;
    (global.fetch as jest.Mock).mockImplementationOnce(async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string);
      return {
        ok: true,
        json: async () => ({ content: [{ text: '{"stem":"test","options":[],"correctFeedback":"","incorrectFeedback":""}' }] }),
      };
    });

    await translateQuizContent(input, "rw", mockConfig);

    const prompt = capturedBody.messages[0].content;
    expect(prompt).toContain("agricultural educator");
    expect(prompt).toContain("English");
    expect(prompt).toContain("Kinyarwanda");
    expect(prompt).toContain("stem");
  });

  test("strips markdown code fences from response", async () => {
    const rawResponse = "```json\n{\"stem\":\"translated\",\"options\":[],\"correctFeedback\":\"\",\"incorrectFeedback\":\"\"}\n```";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: rawResponse }] }),
    });

    const result = await translateQuizContent(input, "fr", mockConfig);
    expect(result.stem).toBe("translated");
  });

  test("throws on API error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(translateQuizContent(input, "fr", mockConfig)).rejects.toThrow("Anthropic API error: 401");
  });

  test("getLLMConfigFromEnv reads from env vars", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_MODEL = "gpt-4";
    process.env.AI_API_KEY = "sk-openai-test";
    const config = getLLMConfigFromEnv();
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4");
    expect(config.apiKey).toBe("sk-openai-test");
    delete process.env.AI_PROVIDER;
    delete process.env.AI_MODEL;
    delete process.env.AI_API_KEY;
  });
});
