// app/api/mbaza/interventions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { notes } = await req.json();

  const flag = await db.interventionFlag.update({
    where: { id: params.id },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedById: session.user.id,
      notes: notes ?? "",
    },
  });

  return NextResponse.json({ flag });
}
