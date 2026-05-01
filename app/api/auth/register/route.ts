// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth";
import { createAuditLog, AuditActions } from "@/lib/audit";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  preferredLanguage: z.enum(["en", "fr", "rw"]).default("en"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    const { name, email, password, preferredLanguage } = parsed.data;

    // Validate password strength
    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      return NextResponse.json(
        { success: false, error: pwValidation.message },
        { status: 400 }
      );
    }

    // Check if email is already in use
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "FARMER", // Registration is always for farmers
        preferredLanguage: preferredLanguage as "en" | "fr" | "rw",
      },
    });

    await createAuditLog({
      userId: user.id,
      action: AuditActions.REGISTER,
      entity: "User",
      entityId: user.id,
      metadata: { role: "FARMER", preferredLanguage },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        data: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register API]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
