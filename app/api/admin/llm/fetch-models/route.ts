// app/api/admin/llm/fetch-models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProviderById } from "@/lib/llmProviders";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { providerId, apiKey } = await req.json();
  const provider = getProviderById(providerId);
  if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  // For providers with live endpoints, attempt to fetch
  if (providerId === "OPENAI" && apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data as { id: string }[])
          .filter((m) => m.id.startsWith("gpt") || m.id.startsWith("o1") || m.id.startsWith("o3"))
          .map((m) => ({
            id: m.id,
            name: m.id,
            contextWindow: 128000,
            modality: "text",
          }));
        return NextResponse.json({ models, live: true });
      }
    } catch {
      // Fall through to curated list
    }
  }

  if (providerId === "MISTRAL" && apiKey) {
    try {
      const res = await fetch("https://api.mistral.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data as { id: string; max_context_length?: number }[]).map((m) => ({
          id: m.id,
          name: m.id,
          contextWindow: m.max_context_length ?? 131072,
          modality: "text",
        }));
        return NextResponse.json({ models, live: true });
      }
    } catch {
      // Fall through to curated list
    }
  }

  // Return curated list for all other providers
  return NextResponse.json({ models: provider.models, live: false });
}
