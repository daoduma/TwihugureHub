// app/api/farmer/courses/[id]/review/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmerId = session.user.id;
  const courseId = params.id;
  const body = await req.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  const enrollment = await db.enrollment.findUnique({
    where: { farmerId_courseId: { farmerId, courseId } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const review = await db.courseReview.upsert({
    where: { farmerId_courseId: { farmerId, courseId } },
    update: { rating, comment: comment || "" },
    create: { farmerId, courseId, rating, comment: comment || "" },
  });

  return NextResponse.json({ review });
}
