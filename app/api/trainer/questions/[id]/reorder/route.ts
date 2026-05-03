// app/api/trainer/questions/[id]/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const question = await db.question.findFirst({
    where: { id: params.id, quiz: { lesson: { module: { course: { trainerId: session.user.id } } } } },
  });
  if (!question) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });

  const { order } = await req.json();
  await db.question.update({ where: { id: params.id }, data: { order } });
  return NextResponse.json({ success: true });
}
