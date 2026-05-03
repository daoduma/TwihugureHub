// lib/resolveContent.ts
// NEW: Shared utility for extracting the correct language from multilingual JSON DB fields.
// Usage: resolveMultilingual(lesson.title, "rw", ["en", "fr"])
import type { JsonValue } from "@prisma/client/runtime/library";

export type MultilingualJson = { en?: string; fr?: string; rw?: string; [key: string]: string | undefined };

/**
 * Resolves a multilingual JSON field to a string in the preferred language.
 * Falls back through fallbackChain if preferred language is missing or empty.
 * Returns an empty string if no valid translation is found.
 */
export function resolveMultilingual(
  jsonField: JsonValue | MultilingualJson | null | undefined,
  preferredLang: string,
  fallbackChain: string[] = ["en", "fr", "rw"]
): string {
  if (!jsonField || typeof jsonField !== "object" || Array.isArray(jsonField)) return "";
  const obj = jsonField as MultilingualJson;

  // Try preferred language first
  if (obj[preferredLang] && typeof obj[preferredLang] === "string" && obj[preferredLang]!.trim()) {
    return obj[preferredLang]!;
  }

  // Walk the fallback chain
  for (const lang of fallbackChain) {
    if (lang !== preferredLang && obj[lang] && typeof obj[lang] === "string" && obj[lang]!.trim()) {
      return obj[lang]!;
    }
  }

  // Last resort: return the first non-empty value
  for (const val of Object.values(obj)) {
    if (val && typeof val === "string" && val.trim()) return val;
  }

  return "";
}

/**
 * Resolves a multilingual field for a specific user's language,
 * using the standard 3-language fallback (en → fr → rw).
 */
export function resolveForUser(
  jsonField: JsonValue | MultilingualJson | null | undefined,
  userLang: string
): string {
  return resolveMultilingual(jsonField, userLang, ["en", "fr", "rw"]);
}
