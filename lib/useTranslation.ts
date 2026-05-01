// lib/useTranslation.ts
"use client";

import { useTranslation as useI18nTranslation } from "react-i18next";
import { useEffect } from "react";
import "@/lib/i18n"; // Ensure i18n is initialized
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
 * Hook to change the app language, storing the preference in a cookie.
 */
export function useLanguageSwitcher() {
  const { i18n } = useI18nTranslation();

  const changeLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    // Cookie is set by LanguageDetector automatically via 'cookie' cache
    document.cookie = `twihugure_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
  };

  return { currentLanguage: i18n.language as Language, changeLanguage };
}

/**
 * Hook to sync the user's preferred language from their session into i18n.
 */
export function useSessionLanguageSync(preferredLanguage?: Language) {
  const { i18n } = useI18nTranslation();

  useEffect(() => {
    if (preferredLanguage && i18n.language !== preferredLanguage) {
      i18n.changeLanguage(preferredLanguage);
    }
  }, [preferredLanguage, i18n]);
}
