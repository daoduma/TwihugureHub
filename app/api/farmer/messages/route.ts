// app/api/farmer/messages/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await db.message.findMany({
    where: { recipientId: session.user.id },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { sentAt: "desc" },
  });

  // Mark unread as read
  await db.message.updateMany({
    where: { recipientId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}
