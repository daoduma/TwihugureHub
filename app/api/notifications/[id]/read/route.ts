// app/api/notifications/[id]/read/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notification = await db.notification.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { isRead: true },
  });

  return NextResponse.json({ updated: notification.count });
}
