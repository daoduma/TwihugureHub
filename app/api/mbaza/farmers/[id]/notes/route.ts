// app/api/mbaza/farmers/[id]/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Note body is required" }, { status: 400 });

  const note = await db.farmerNote.create({
    data: { farmerId: params.id, authorId: session.user.id, body },
    include: { author: { select: { name: true, role: true } } },
  });

  return NextResponse.json({ note }, { status: 201 });
}
