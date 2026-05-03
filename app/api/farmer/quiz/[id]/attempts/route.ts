// app/api/farmer/quiz/[id]/attempts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmerId = session.user.id;
  const quizId = params.id;

  const attempts = await db.quizAttempt.findMany({
    where: { farmerId, quizId },
    include: { answers: true },
    orderBy: { attemptNumber: "desc" },
  });

  return NextResponse.json({ attempts });
}
