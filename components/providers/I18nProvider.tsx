// components/providers/I18nProvider.tsx
"use client";

import { useEffect } from "react";
import "@/lib/i18n"; // initialize i18next
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import type { Language } from "@/types";

interface Props {
  children: React.ReactNode;
  language?: Language;
}

export function I18nProvider({ children, language }: Props) {
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
