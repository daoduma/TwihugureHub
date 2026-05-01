// lib/audit.ts
import { Prisma } from "@prisma/client";
import { db } from "./db";

interface AuditOptions {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(options: AuditOptions): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        metadata: (options.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}

export const AuditActions = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  UPDATE_PROFILE: "UPDATE_PROFILE",
  CHANGE_PASSWORD: "CHANGE_PASSWORD",
  CREATE_USER: "CREATE_USER",
  DEACTIVATE_USER: "DEACTIVATE_USER",
  ACTIVATE_USER: "ACTIVATE_USER",
} as const;
