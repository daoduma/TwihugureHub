// app/api/admin/users/route.ts
// CHANGED: Added audit log for user creation
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAction, AuditActions } from "@/lib/auditLog";
import type { Role, Language } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }];

  const [users, total] = await db.$transaction([
    db.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, preferredLanguage: true, isActive: true, createdAt: true } }),
    db.user.count({ where }),
  ]);
  return NextResponse.json({ users, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN", statusCode: 403 }, { status: 403 });
  }
  const body = await req.json();
  const { name, email, password, role, preferredLanguage } = body;
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "name, email, password, and role are required", code: "VALIDATION_ERROR", statusCode: 400 }, { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use", code: "CONFLICT", statusCode: 409 }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { name, email, passwordHash, role: role as Role, preferredLanguage: (preferredLanguage ?? "en") as Language },
    select: { id: true, name: true, email: true, role: true, preferredLanguage: true, createdAt: true },
  });

  // CHANGED: Audit log for user creation
  await logAction(session.user.id, AuditActions.USER_CREATED, "User", user.id, { name, email, role });

  return NextResponse.json({ user }, { status: 201 });
}
