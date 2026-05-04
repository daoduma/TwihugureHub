// app/api/admin/users/[id]/status/route.ts
// CHANGED: Added audit log for user activation/deactivation + super-admin protection
import { NextRequest, NextResponse } from "next/server";

/** Accounts that can never be deactivated by other admins. */
const SUPER_ADMIN_EMAILS = ["chemistgeeky1992@gmail.com"];
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction, AuditActions } from "@/lib/auditLog";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }
  // Super-admin protection: resolve target email before applying any change.
  const targetUser = await db.user.findUnique({ where: { id: params.id }, select: { email: true } });
  if (targetUser && SUPER_ADMIN_EMAILS.includes(targetUser.email.toLowerCase())) {
    return NextResponse.json(
      { error: "This account is protected and cannot be deactivated." },
      { status: 403 }
    );
  }

  const { isActive } = await req.json();
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive (boolean) is required", code: "VALIDATION_ERROR", statusCode: 400 }, { status: 400 });
  }
  const user = await db.user.update({
    where: { id: params.id },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // CHANGED: Audit log
  await logAction(session.user.id, isActive ? AuditActions.USER_ACTIVATED : AuditActions.USER_DEACTIVATED, "User", params.id, { isActive });

  return NextResponse.json({ user });
}
