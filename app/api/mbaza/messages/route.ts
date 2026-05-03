// app/api/mbaza/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Language } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await db.message.findMany({
    where: { senderId: session.user.id },
    include: {
      recipient: { select: { name: true, email: true } },
    },
    orderBy: { sentAt: "desc" },
  });

  // Augment with group name if groupId is present
  const enriched = await Promise.all(
    messages.map(async (m) => {
      let groupName: string | null = null;
      if (m.groupId) {
        const grp = await db.farmerGroup.findUnique({ where: { id: m.groupId }, select: { name: true } });
        groupName = grp?.name ?? null;
      }
      return { ...m, groupName };
    })
  );

  return NextResponse.json({ messages: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { recipientId, groupId, subject, body, language } = await req.json();

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  if (!recipientId && !groupId) {
    return NextResponse.json({ error: "Provide either recipientId or groupId" }, { status: 400 });
  }

  if (groupId) {
    // Fan-out: create one message per group member
    const memberships = await db.farmerGroupMembership.findMany({
      where: { groupId },
      include: { farmer: { select: { preferredLanguage: true } } },
    });

    const msgs = await Promise.all(
      memberships.map((m) =>
        db.message.create({
          data: {
            senderId: session.user.id,
            recipientId: m.farmerId,
            groupId,
            subject,
            body,
            language: (m.farmer.preferredLanguage as Language) ?? (language as Language) ?? "en",
          },
        })
      )
    );

    // Notify each group member
    await Promise.all(
      memberships.map((m) =>
        createNotification(m.farmerId, "MESSAGE_RECEIVED", undefined, undefined, {
          type: "message",
          id: msgs[memberships.indexOf(m)]?.id ?? "",
        })
      )
    );

    return NextResponse.json({ sent: msgs.length }, { status: 201 });
  }

  // Single recipient
  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { preferredLanguage: true },
  });

  const message = await db.message.create({
    data: {
      senderId: session.user.id,
      recipientId,
      subject,
      body,
      language: (recipient?.preferredLanguage as Language) ?? (language as Language) ?? "en",
    },
  });

  // Notify the recipient
  await createNotification(recipientId, "MESSAGE_RECEIVED", undefined, undefined, {
    type: "message",
    id: message.id,
  });

  return NextResponse.json({ message }, { status: 201 });
}
