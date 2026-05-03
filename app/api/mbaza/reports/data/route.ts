// app/api/mbaza/reports/data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildReportData, type ReportType } from "@/lib/mbaza/reportBuilder";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") ?? "completion") as ReportType;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const groupId = searchParams.get("groupId") ?? undefined;
  const courseId = searchParams.get("courseId") ?? undefined;
  const language = searchParams.get("language") ?? undefined;

  const data = await buildReportData({ type, from, to, groupId, courseId, language });
  return NextResponse.json(data);
}
