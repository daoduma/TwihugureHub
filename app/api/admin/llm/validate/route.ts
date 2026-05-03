// app/api/admin/llm/validate/route.ts
// CHANGED: Added audit logging and consistent error shapes
import { NextRequest, NextResponse } from "next/server";
import { logAction, AuditActions } from "@/lib/auditLog"; // CHANGED
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function testOpenAI(apiKey: string, modelId: string, baseUrl?: string) {
  const base = baseUrl ?? "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "API call failed");
  return true;
}

async function testAnthropic(apiKey: string, modelId: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 5,
      messages: [{ role: "user", content: "Hi" }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "API call failed");
  return true;
}

async function testMistral(apiKey: string, modelId: string) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "API call failed");
  return true;
}

async function testGoogle(apiKey: string, modelId: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hi" }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "API call failed");
  return true;
}

async function testCohere(apiKey: string, modelId: string) {
  const res = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: modelId, message: "Hi", max_tokens: 5 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "API call failed");
  return true;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }

  const { provider, modelId, apiKey, baseUrl } = await req.json();

  try {
    switch (provider) {
      case "OPENAI":
      case "CUSTOM":
        await testOpenAI(apiKey, modelId, baseUrl);
        break;
      case "ANTHROPIC":
        await testAnthropic(apiKey, modelId);
        break;
      case "MISTRAL":
        await testMistral(apiKey, modelId);
        break;
      case "GOOGLE":
        await testGoogle(apiKey, modelId);
        break;
      case "COHERE":
        await testCohere(apiKey, modelId);
        break;
      default:
        throw new Error("Unknown provider");
    }
    // CHANGED: Audit log successful validation
    await logAction(session.user.id, AuditActions.LLM_CONFIG_VALIDATED, "LLMConfig", undefined, { provider, modelId });
    return NextResponse.json({ valid: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ valid: false, error: message }, { status: 200 });
  }
}
