// lib/auditLog.ts
// NEW: Central audit logging utility. Mirrors lib/audit.ts but uses the spec name.
// CHANGED: Extended AuditActions with all sensitive operations per spec.
import { db } from "./db";

export interface AuditLogOptions {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/** Logs a sensitive action to the audit_logs table. Never throws. */
export async function logAction(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.auditLog.create({
      data: { userId, action, entity, entityId, metadata: metadata ?? {} },
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}

export const AuditActions = {
  // User management
  USER_CREATED:        "USER_CREATED",
  USER_EDITED:         "USER_EDITED",
  USER_DEACTIVATED:    "USER_DEACTIVATED",
  USER_ACTIVATED:      "USER_ACTIVATED",
  USER_REGISTERED:     "USER_REGISTERED",
  LOGIN:               "LOGIN",
  LOGOUT:              "LOGOUT",
  PASSWORD_CHANGED:    "PASSWORD_CHANGED",

  // Course lifecycle
  COURSE_CREATED:      "COURSE_CREATED",
  COURSE_UPDATED:      "COURSE_UPDATED",
  COURSE_SUBMITTED:    "COURSE_SUBMITTED",
  COURSE_APPROVED:     "COURSE_APPROVED",
  COURSE_REJECTED:     "COURSE_REJECTED",
  COURSE_ARCHIVED:     "COURSE_ARCHIVED",

  // LLM / API key management
  LLM_CONFIG_UPDATED:  "LLM_CONFIG_UPDATED",
  LLM_CONFIG_VALIDATED:"LLM_CONFIG_VALIDATED",
  API_KEY_ROTATED:     "API_KEY_ROTATED",

  // Quiz
  QUIZ_ATTEMPT:        "QUIZ_ATTEMPT",
  QUIZ_PASSED:         "QUIZ_PASSED",
  QUIZ_FAILED:         "QUIZ_FAILED",

  // Interventions
  FLAG_CREATED:        "FLAG_CREATED",
  FLAG_RESOLVED:       "FLAG_RESOLVED",
} as const;

export type AuditActionType = typeof AuditActions[keyof typeof AuditActions];
