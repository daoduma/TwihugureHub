// app/api/admin/llm/test/route.ts
// Tests the currently stored LLM config by decrypting the key server-side.
// Called by the "Test Connection" button in the admin AI settings UI.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/crypto";
import { logAction, AuditActions } from "@/lib/auditLog";

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
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN", statusCode: 403 },
      { status: 403 }
    );
  }

  // Load the stored config from DB
  const config = await db.lLMConfig.findUnique({ where: { singleton: 1 } });
  if (!config) {
    return NextResponse.json(
      { valid: false, error: "No LLM configuration found. Please save a configuration first." },
      { status: 200 }
    );
  }

  let decryptedKey: string;
  try {
    decryptedKey = decryptApiKey(config.apiKey);
  } catch {
    return NextResponse.json(
      { valid: false, error: "Failed to decrypt stored API key. The ENCRYPTION_SECRET may have changed." },
      { status: 200 }
    );
  }

  try {
    switch (config.provider) {
      case "OPENAI":
      case "CUSTOM":
        await testOpenAI(decryptedKey, config.modelId, config.baseUrl ?? undefined);
        break;
      case "ANTHROPIC":
        await testAnthropic(decryptedKey, config.modelId);
        break;
      case "MISTRAL":
        await testMistral(decryptedKey, config.modelId);
        break;
      case "GOOGLE":
        await testGoogle(decryptedKey, config.modelId);
        break;
      case "COHERE":
        await testCohere(decryptedKey, config.modelId);
        break;
      default:
        throw new Error("Unknown provider: " + config.provider);
    }

    // Update validatedAt timestamp on successful test
    await db.lLMConfig.update({
      where: { singleton: 1 },
      data: { validatedAt: new Date() },
    });

    await logAction(
      session.user.id,
      AuditActions.LLM_CONFIG_VALIDATED,
      "LLMConfig",
      config.id,
      { provider: config.provider, modelId: config.modelId }
    );

    return NextResponse.json({ valid: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ valid: false, error: message }, { status: 200 });
  }
}
