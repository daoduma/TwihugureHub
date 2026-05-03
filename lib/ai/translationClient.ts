// lib/ai/translationClient.ts
// CHANGED: getLLMConfig() reads from DB first (decrypts key), falls back to env vars
export type SupportedLanguage = "en" | "fr" | "rw";
export type LLMProvider = "anthropic" | "openai" | "google" | "mistral" | "openai_compatible";

export interface MultilingualField { en: string; fr: string; rw: string; }
export interface TranslationInput {
  stem: MultilingualField;
  options?: { id: string; text: MultilingualField }[];
  correctFeedback?: MultilingualField;
  incorrectFeedback?: MultilingualField;
  sourceLanguage: SupportedLanguage;
}
export interface TranslationOutput {
  stem: string;
  options?: { id: string; text: string }[];
  correctFeedback?: string;
  incorrectFeedback?: string;
}
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

/** CHANGED: Reads DB config first; decrypts the API key. Falls back to env vars. */
export async function getLLMConfig(): Promise<LLMConfig> {
  try {
    const { db } = await import("@/lib/db");
    const { decryptApiKey } = await import("@/lib/crypto");
    const dbConfig = await db.lLMConfig.findUnique({ where: { singleton: 1 } });
    if (dbConfig && dbConfig.isActive && dbConfig.apiKey) {
      return {
        provider: dbConfig.provider.toLowerCase() as LLMProvider,
        model: dbConfig.modelId,
        apiKey: decryptApiKey(dbConfig.apiKey),
        baseUrl: dbConfig.baseUrl ?? undefined,
      };
    }
  } catch (err) {
    console.warn("[translationClient] DB config unavailable, using env vars:", err);
  }
  return getLLMConfigFromEnv();
}

export function getLLMConfigFromEnv(): LLMConfig {
  return {
    provider: (process.env.AI_PROVIDER || "anthropic") as LLMProvider,
    model: process.env.AI_MODEL || "claude-sonnet-4-20250514",
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: process.env.AI_BASE_URL,
  };
}

const LANG_NAMES: Record<SupportedLanguage, string> = { en: "English", fr: "French", rw: "Kinyarwanda" };

function buildPrompt(input: TranslationInput, targetLanguage: SupportedLanguage): string {
  const src = input.sourceLanguage;
  const sourceContent = {
    stem: input.stem[src],
    options: input.options?.map((o) => ({ id: o.id, text: o.text[src] })),
    correctFeedback: input.correctFeedback?.[src],
    incorrectFeedback: input.incorrectFeedback?.[src],
  };
  return `You are a professional agricultural educator and translator.
Translate the following quiz content from ${LANG_NAMES[src]} to ${LANG_NAMES[targetLanguage]}.
Rules:
- Preserve all agricultural and technical terminology accurately
- Translate naturally and clearly for rural Rwandan farmers (if target is Kinyarwanda)
- Maintain consistent voice and tone across question stem and answer options
- Do NOT translate IDs, keep them exactly as given
- Return ONLY a valid JSON object with no preamble, no markdown, no explanation

Source content (${LANG_NAMES[src]}):
${JSON.stringify(sourceContent, null, 2)}

Return JSON with this exact shape:
{"stem":"<translated>","options":[{"id":"<same>","text":"<translated>"}],"correctFeedback":"<translated>","incorrectFeedback":"<translated>"}`;
}

async function callAnthropic(prompt: string, config: LLMConfig): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: config.model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  return (await res.json()).content?.[0]?.text ?? "";
}

async function callOpenAI(prompt: string, config: LLMConfig): Promise<string> {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

async function callGoogle(prompt: string, config: LLMConfig): Promise<string> {
  const model = config.model || "gemini-1.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } }),
  });
  if (!res.ok) throw new Error(`Google API error: ${res.status} ${await res.text()}`);
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callMistral(prompt: string, config: LLMConfig): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model || "mistral-small-latest", messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Mistral API error: ${res.status} ${await res.text()}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

function parseTranslationResponse(raw: string): TranslationOutput {
  return JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()) as TranslationOutput;
}

export async function translateQuizContent(content: TranslationInput, targetLanguage: SupportedLanguage, config: LLMConfig): Promise<TranslationOutput> {
  const prompt = buildPrompt(content, targetLanguage);
  let raw: string;
  switch (config.provider) {
    case "anthropic": raw = await callAnthropic(prompt, config); break;
    case "openai": case "openai_compatible": raw = await callOpenAI(prompt, config); break;
    case "google": raw = await callGoogle(prompt, config); break;
    case "mistral": raw = await callMistral(prompt, config); break;
    default: raw = await callOpenAI(prompt, config);
  }
  return parseTranslationResponse(raw);
}
