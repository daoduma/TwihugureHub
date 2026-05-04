// components/providers/LanguageSync.tsx
// Syncs the session user's saved preferredLanguage into i18n on every mount/session change.
// Rendered inside DashboardShell so it runs on every authenticated page.
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import i18n from "@/lib/i18n";
import type { Language } from "@/types";

export function LanguageSync() {
  const { data: session } = useSession();
  const preferred = session?.user?.preferredLanguage as Language | undefined;

  useEffect(() => {
    if (preferred && i18n.language !== preferred) {
      i18n.changeLanguage(preferred);
      // Keep the cookie in sync so LanguageDetector agrees on next hard-reload
      document.cookie = `twihugure_lang=${preferred}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
  }, [preferred]);

  return null;
}
