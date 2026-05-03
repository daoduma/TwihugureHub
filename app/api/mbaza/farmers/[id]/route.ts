// app/api/mbaza/farmers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const farmer = await db.user.findUnique({
    where: { id: params.id, role: "FARMER" },
    include: {
      groupMemberships: { include: { group: { select: { id: true, name: true, region: true } } } },
      enrollments: {
        include: {
          course: {
            include: {
              modules: {
                include: {
                  lessons: {
                    include: {
                      progress: { where: { farmerId: params.id } },
                      quiz: {
                        include: {
                          attempts: {
                            where: { farmerId: params.id },
                            orderBy: { attemptNumber: "asc" },
                          },
                        },
                      },
                    },
                  },
                },
                orderBy: { order: "asc" },
              },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
      },
      farmerNotes: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      interventionFlags: {
        include: { course: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!farmer) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });

  return NextResponse.json({ farmer });
}
