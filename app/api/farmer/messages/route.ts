// app/api/farmer/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — fetch messages only; never mutate read state
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

  return NextResponse.json({ messages });
}

// PATCH — mark specific messages as read (called explicitly by the client)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { messageIds } = body as { messageIds?: string[] };

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json({ error: "messageIds array is required" }, { status: 400 });
  }

  await db.message.updateMany({
    where: {
      id: { in: messageIds },
      recipientId: session.user.id, // safety: only own messages
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
