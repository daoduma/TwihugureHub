// components/ui/LanguageSelector.tsx
"use client";

import { Globe } from "lucide-react";
import { useLanguageSwitcher } from "@/lib/useTranslation";
import { SUPPORTED_LANGUAGES } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "dark" | "light";
  showLabel?: boolean;
}

export function LanguageSelector({ variant = "light", showLabel = false }: Props) {
  const { currentLanguage, changeLanguage } = useLanguageSwitcher();

  const isDark = variant === "dark";

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Globe
        size={15}
        className={cn(isDark ? "text-brand-300" : "text-brand-600")}
      />
      {showLabel && (
        <span className={cn("text-xs font-medium", isDark ? "text-brand-300" : "text-brand-700")}>
          Lang:
        </span>
      )}
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value as "en" | "fr" | "rw")}
        className={cn(
          "cursor-pointer rounded-md border py-1 pl-1 pr-5 text-xs font-medium",
          "appearance-none bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-400",
          isDark
            ? "border-brand-700 text-brand-200 hover:border-brand-500"
            : "border-brand-200 text-brand-700 hover:border-brand-400"
        )}
        aria-label="Select language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option
            key={lang.code}
            value={lang.code}
            className="bg-white text-gray-900"
          >
            {lang.nativeLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
