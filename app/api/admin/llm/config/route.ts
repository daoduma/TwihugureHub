// app/api/admin/llm/config/route.ts
// CHANGED: Added audit logging for LLM config changes
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptApiKey, maskApiKey } from "@/lib/crypto";
import { logAction, AuditActions } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }
  const config = await db.lLMConfig.findUnique({ where: { singleton: 1 } });
  if (!config) return NextResponse.json({ config: null });
  return NextResponse.json({
    config: {
      id: config.id, provider: config.provider, modelId: config.modelId,
      maskedApiKey: maskApiKey(config.apiKey), baseUrl: config.baseUrl,
      isActive: config.isActive, validatedAt: config.validatedAt, updatedAt: config.updatedAt,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }
  const body = await req.json();
  const { provider, modelId, apiKey, baseUrl } = body;
  if (!provider || !modelId || !apiKey) {
    return NextResponse.json({ error: "provider, modelId and apiKey are required", code: "VALIDATION_ERROR", statusCode: 400 }, { status: 400 });
  }
  const encrypted = encryptApiKey(apiKey);
  const config = await db.lLMConfig.upsert({
    where: { singleton: 1 },
    update: { provider, modelId, apiKey: encrypted, baseUrl: baseUrl ?? null, validatedAt: null, isActive: true },
    create: { singleton: 1, provider, modelId, apiKey: encrypted, baseUrl: baseUrl ?? null, isActive: true },
  });

  // CHANGED: Audit log
  await logAction(session.user.id, AuditActions.LLM_CONFIG_UPDATED, "LLMConfig", config.id, { provider, modelId, baseUrl });

  return NextResponse.json({ success: true, config: { id: config.id, provider, modelId, isActive: config.isActive } });
}
