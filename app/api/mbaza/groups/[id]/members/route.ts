// app/api/mbaza/groups/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MBAZA_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { add = [], remove = [] } = await req.json() as { add?: string[]; remove?: string[] };

  // Add new members (upsert to avoid duplicates)
  for (const farmerId of add) {
    await db.farmerGroupMembership.upsert({
      where: { groupId_farmerId: { groupId: params.id, farmerId } },
      create: { groupId: params.id, farmerId },
      update: {},
    });
  }

  // Remove specified members
  if (remove.length > 0) {
    await db.farmerGroupMembership.deleteMany({
      where: { groupId: params.id, farmerId: { in: remove } },
    });
  }

  const memberships = await db.farmerGroupMembership.findMany({
    where: { groupId: params.id },
    include: { farmer: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ memberships });
}
