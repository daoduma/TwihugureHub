// lib/apiError.ts
// NEW: Consistent API error response shapes per spec
import { NextResponse } from "next/server";

export interface ApiErrorShape {
  error: string;
  code: string;
  statusCode: number;
}

export function apiError(error: string, code: string, statusCode: number): NextResponse {
  return NextResponse.json({ error, code, statusCode } satisfies ApiErrorShape, { status: statusCode });
}

export const ApiErrors = {
  unauthorized: () => apiError("Unauthorized", "UNAUTHORIZED", 401),
  forbidden:    () => apiError("Forbidden", "FORBIDDEN", 403),
  notFound:     (entity = "Resource") => apiError(`${entity} not found`, "NOT_FOUND", 404),
  validation:   (msg: string) => apiError(msg, "VALIDATION_ERROR", 400),
  conflict:     (msg: string) => apiError(msg, "CONFLICT", 409),
  internal:     (msg = "Internal server error") => apiError(msg, "INTERNAL_ERROR", 500),
};
