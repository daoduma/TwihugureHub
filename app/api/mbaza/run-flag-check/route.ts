// app/api/mbaza/run-flag-check/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runFlagCheck } from "@/lib/mbaza/flagEngine";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runFlagCheck();
  return NextResponse.json({ success: true, ...result });
}
