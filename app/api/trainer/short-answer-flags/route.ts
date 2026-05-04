// app/api/trainer/short-answer-flags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["TRAINER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "OPEN";

  const trainerFilter =
    session.user.role === "TRAINER"
      ? {
          answer: {
            attempt: {
              quiz: {
                lesson: {
                  module: { course: { trainerId: session.user.id } },
                },
              },
            },
          },
        }
      : {};

  const flags = await db.shortAnswerFlag.findMany({
    where: {
      ...(status !== "ALL" ? { status: status as "OPEN" | "REVIEWED" | "RESOLVED" } : {}),
      ...trainerFilter,
    },
    include: {
      farmer: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true } },
      answer: {
        include: {
          question: { select: { stem: true, desiredResponse: true } },
          attempt: {
            include: {
              quiz: {
                select: {
                  id: true,
                  title: true,
                  lesson: {
                    select: {
                      title: true,
                      module: {
                        select: {
                          course: { select: { id: true, title: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: flags });
}
