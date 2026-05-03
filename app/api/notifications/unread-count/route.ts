// app/api/notifications/unread-count/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const count = await db.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return NextResponse.json({ count });
}
