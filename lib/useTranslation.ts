// lib/useTranslation.ts
"use client";

import { useTranslation as useI18nTranslation } from "react-i18next";
import { useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import "@/lib/i18n"; // Ensure i18n is initialized
import i18n from "@/lib/i18n";
import type { Language } from "@/types";

/**
 * Custom useTranslation wrapper that ensures i18n is initialized
 * and provides type-safe translation helpers.
 */
export function useTranslation(ns = "common") {
  const { t, i18n } = useI18nTranslation(ns);
  return { t, i18n };
}

/**
 * Hook to change the app UI language AND persist it to the user's DB profile.
 * Keeps cookie, i18n state, and DB all in sync in one call.
 */
export function useLanguageSwitcher() {
  const { i18n } = useI18nTranslation();
  const { update: updateSession } = useSession();

  const changeLanguage = useCallback(
    async (lang: Language) => {
      // 1. Update i18n immediately (instant UI re-render)
      i18n.changeLanguage(lang);

      // 2. Persist cookie so LanguageDetector keeps it on hard-reload
      document.cookie = `twihugure_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;

      // 3. Persist to DB and update the session token (best-effort)
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredLanguage: lang }),
        });
        // Refresh the NextAuth session so preferredLanguage is up-to-date
        await updateSession({ preferredLanguage: lang });
      } catch {
        // Non-fatal — cookie + i18n are already updated
      }
    },
    [i18n, updateSession]
  );

  return { currentLanguage: i18n.language as Language, changeLanguage };
}

/**
 * Hook to sync the user's preferred language from their session into i18n.
 * Used in cases where LanguageSync component is not available.
 */
export function useSessionLanguageSync(preferredLanguage?: Language) {
  const { i18n } = useI18nTranslation();

  useEffect(() => {
    if (preferredLanguage && i18n.language !== preferredLanguage) {
      i18n.changeLanguage(preferredLanguage);
    }
  }, [preferredLanguage, i18n]);
}

/**
 * Returns the active display language for dynamic multilingual content
 * (e.g., course.title[lang]). Prefers the i18n language (which is always
 * in sync with the user's preference via LanguageSync) and falls back to "en".
 */
export function useContentLanguage(): Language {
  const { i18n } = useI18nTranslation();
  const lang = i18n.language as Language;
  return ["en", "fr", "rw"].includes(lang) ? lang : "en";
}
