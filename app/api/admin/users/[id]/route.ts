// app/api/admin/users/[id]/route.ts
// CHANGED: Added audit logging for user edits
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction, AuditActions } from "@/lib/auditLog"; // CHANGED: audit logging
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, role, preferredLanguage, newPassword } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email.toLowerCase().trim();
  if (role) updateData.role = role;
  if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;
  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const user = await db.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE_USER",
    entity: "User",
    entityId: params.id,
    metadata: { fields: Object.keys(updateData) },
  });

  return NextResponse.json({ user });
}
