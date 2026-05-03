// components/trainer/RichTextEditor.tsx
"use client";

import { useState, useCallback } from "react";

type Lang = "en" | "fr" | "rw";

interface RichTextEditorProps {
  value: { en: string; fr: string; rw: string };
  onChange: (val: { en: string; fr: string; rw: string }) => void;
  label?: string;
}

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "rw", label: "Ikinyarwanda" },
];

// Toolbar button
function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className="px-2 py-1 text-sm rounded hover:bg-gray-200 text-gray-700 font-medium"
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const [active, setActive] = useState<Lang>("en");

  const execCmd = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    onChange({ ...value, [active]: html });
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Language tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActive(lang.code)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                active === lang.code
                  ? "bg-white text-green-700 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50 flex-wrap">
          <ToolbarBtn onClick={() => execCmd("bold")} title="Bold">
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("italic")} title="Italic">
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("underline")} title="Underline">
            <span className="underline">U</span>
          </ToolbarBtn>
          <span className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarBtn onClick={() => execCmd("insertUnorderedList")} title="Bullet list">
            • List
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("insertOrderedList")} title="Numbered list">
            1. List
          </ToolbarBtn>
          <span className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarBtn onClick={() => execCmd("formatBlock", "h3")} title="Heading">
            H3
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("formatBlock", "p")} title="Paragraph">
            ¶
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("removeFormat")} title="Clear formatting">
            Tx
          </ToolbarBtn>
        </div>
        {/* Editable content */}
        <div
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value[active] }}
          className="min-h-[150px] p-3 text-sm focus:outline-none prose prose-sm max-w-none"
          key={active} // re-mount on language switch so dangerouslySetInnerHTML refreshes
        />
      </div>
    </div>
  );
}
