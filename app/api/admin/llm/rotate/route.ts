// app/api/admin/llm/rotate/route.ts
// NEW: API key rotation endpoint with audit logging
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptApiKey } from "@/lib/crypto";
import { logAction, AuditActions } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }

  const body = await req.json();
  const { newApiKey } = body;

  if (!newApiKey || typeof newApiKey !== "string" || newApiKey.length < 8) {
    return NextResponse.json({ error: "A valid new API key is required", code: "VALIDATION_ERROR", statusCode: 400 }, { status: 400 });
  }

  const existing = await db.lLMConfig.findUnique({ where: { singleton: 1 } });
  if (!existing) {
    return NextResponse.json({ error: "No LLM config found. Please configure the provider first.", code: "NOT_FOUND", statusCode: 404 }, { status: 404 });
  }

  const encrypted = encryptApiKey(newApiKey);
  const updated = await db.lLMConfig.update({
    where: { singleton: 1 },
    data: { apiKey: encrypted, validatedAt: null },
  });

  // CHANGED: Audit log for API key rotation
  await logAction(session.user.id, AuditActions.API_KEY_ROTATED, "LLMConfig", updated.id, {
    provider: existing.provider,
    modelId: existing.modelId,
    rotatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, message: "API key rotated successfully. Please validate the new key." });
}
