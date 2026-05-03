// components/trainer/LangTabs.tsx
"use client";

import { useState } from "react";

type Lang = "en" | "fr" | "rw";

interface LangTabsProps {
  value: { en: string; fr: string; rw: string };
  onChange: (val: { en: string; fr: string; rw: string }) => void;
  multiline?: boolean;
  label?: string;
  placeholder?: { en: string; fr: string; rw: string };
  rows?: number;
}

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "rw", label: "RW" },
];

export function LangTabs({
  value,
  onChange,
  multiline,
  label,
  placeholder,
  rows = 4,
}: LangTabsProps) {
  const [active, setActive] = useState<Lang>("en");

  const handleChange = (text: string) => {
    onChange({ ...value, [active]: text });
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActive(lang.code)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                active === lang.code
                  ? "bg-white text-green-700 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        {/* Input area */}
        <div className="bg-white">
          {multiline ? (
            <textarea
              value={value[active]}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder?.[active] ?? ""}
              rows={rows}
              className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 resize-none"
            />
          ) : (
            <input
              type="text"
              value={value[active]}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder?.[active] ?? ""}
              className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
            />
          )}
        </div>
      </div>
    </div>
  );
}
