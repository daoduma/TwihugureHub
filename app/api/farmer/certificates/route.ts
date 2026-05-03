// app/api/farmer/certificates/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificates = await db.certificate.findMany({
    where: { farmerId: session.user.id },
    include: {
      course: { select: { id: true, title: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json({ certificates });
}
