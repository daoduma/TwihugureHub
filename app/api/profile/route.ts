// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, preferredLanguage } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const validLangs = ["en", "fr", "rw"];
  if (preferredLanguage && !validLangs.includes(preferredLanguage)) {
    return NextResponse.json({ error: "Invalid language." }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      ...(preferredLanguage ? { preferredLanguage } : {}),
    },
  });

  return NextResponse.json({ success: true });
}
