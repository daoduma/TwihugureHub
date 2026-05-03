// lib/i18n.ts
"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import all translation files directly (works in App Router without HTTP backend)
import enCommon from "@/locales/en/common.json";
import frCommon from "@/locales/fr/common.json";
import rwCommon from "@/locales/rw/common.json";

export const defaultNS = "common";
export const resources = {
  en: { common: enCommon },
  fr: { common: frCommon },
  rw: { common: rwCommon },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      defaultNS,
      fallbackLng: "en",
      supportedLngs: ["en", "fr", "rw"],

      detection: {
        order: ["cookie", "localStorage", "navigator"],
        caches: ["cookie"],
        cookieName: "twihugure_lang",
        cookieMinutes: 60 * 24 * 365, // 1 year
      },

      interpolation: {
        escapeValue: false,
      },

      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
