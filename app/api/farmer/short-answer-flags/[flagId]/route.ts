// app/api/farmer/short-answer-flags/[flagId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — retrieve a specific flag's current status (so the UI can poll)
export async function GET(
  _req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "FARMER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const flag = await db.shortAnswerFlag.findUnique({
    where: { id: params.flagId },
    include: {
      answer: { select: { id: true, questionId: true, gradingStatus: true, manualScore: true, trainerFeedback: true } },
    },
  });

  if (!flag || flag.farmerId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Flag not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: flag });
}

// DELETE — withdraw / cancel an open flag (farmer changes their mind)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "FARMER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const flag = await db.shortAnswerFlag.findUnique({
    where: { id: params.flagId },
  });

  if (!flag || flag.farmerId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Flag not found" }, { status: 404 });
  }

  if (flag.status !== "OPEN") {
    return NextResponse.json(
      { success: false, error: "Only open flags can be withdrawn" },
      { status: 409 }
    );
  }

  await db.shortAnswerFlag.delete({ where: { id: params.flagId } });

  return NextResponse.json({ success: true });
}
