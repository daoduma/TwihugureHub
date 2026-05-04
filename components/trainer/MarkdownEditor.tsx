// components/trainer/MarkdownEditor.tsx
"use client";

import { useRef, useState } from "react";
import {
  Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon,
  Image as ImageIcon, Code, Quote, Eye, Pencil,
} from "lucide-react";
import { MarkdownContent } from "@/components/ui/MarkdownContent";

type Lang = "en" | "fr" | "rw";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "rw", label: "Ikinyarwanda" },
];

interface Props {
  value: { en: string; fr: string; rw: string };
  onChange: (v: { en: string; fr: string; rw: string }) => void;
  label?: string;
}

export function MarkdownEditor({ value, onChange, label }: Props) {
  const [active, setActive] = useState<Lang>("en");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const text = value[active] ?? "";

  const update = (newText: string) => {
    onChange({ ...value, [active]: newText });
  };

  // Wrap the current selection (or insert a placeholder) with markdown markers.
  const wrap = (before: string, after = before, placeholder = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = text.slice(start, end) || placeholder;
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    update(next);
    // Restore the selection so the user can keep typing inside the markers
    requestAnimationFrame(() => {
      ta.focus();
      const cursorStart = start + before.length;
      ta.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  };

  // Insert a prefix at the start of the current line (for headings, lists, quotes).
  const linePrefix = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = text.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const next = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    update(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Top bar: language tabs (left) + mode tabs (right) */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="flex">
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
          <div className="flex-1" />
          <div className="flex">
            <button
              type="button"
              onClick={() => setMode("write")}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium ${
                mode === "write"
                  ? "bg-white text-green-700 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Pencil size={11} /> Write
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium ${
                mode === "preview"
                  ? "bg-white text-green-700 border-b-2 border-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Eye size={11} /> Preview
            </button>
          </div>
        </div>

        {/* Toolbar (only in write mode) */}
        {mode === "write" && (
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50 flex-wrap">
            <ToolbarBtn onClick={() => wrap("**", "**", "bold text")} title="Bold (**text**)">
              <Bold size={12} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => wrap("*", "*", "italic text")} title="Italic (*text*)">
              <Italic size={12} />
            </ToolbarBtn>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <ToolbarBtn onClick={() => linePrefix("## ")} title="Heading (## )">
              <Heading2 size={12} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => linePrefix("- ")} title="Bullet list (- )">
              <List size={12} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => linePrefix("1. ")} title="Numbered list (1. )">
              <ListOrdered size={12} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => linePrefix("> ")} title="Quote (> )">
              <Quote size={12} />
            </ToolbarBtn>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <ToolbarBtn onClick={() => wrap("`", "`", "code")} title="Inline code">
              <Code size={12} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => wrap("[", "](https://)", "link text")}
              title="Link"
            >
              <LinkIcon size={12} />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => wrap("![", "](https://)", "alt text")}
              title="Image"
            >
              <ImageIcon size={12} />
            </ToolbarBtn>
          </div>
        )}

        {/* Body */}
        {mode === "write" ? (
          <textarea
            // Re-mount when language changes so the textarea content fully
            // refreshes (browsers can hold stale uncontrolled state otherwise).
            key={active}
            ref={textareaRef}
            value={text}
            onChange={(e) => update(e.target.value)}
            placeholder="Write your lesson in Markdown…"
            className="block w-full min-h-[260px] p-3 text-sm font-mono focus:outline-none resize-y"
          />
        ) : (
          <div className="min-h-[260px] p-4">
            {text.trim() ? (
              <MarkdownContent source={text} />
            ) : (
              <p className="text-sm text-gray-400 italic">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400">
        Markdown supported: <code>**bold**</code>, <code>*italic*</code>,{" "}
        <code># heading</code>, <code>- list</code>, <code>[link](url)</code>,{" "}
        <code>![image](url)</code>, <code>{"> quote"}</code>, <code>`code`</code>
      </p>
    </div>
  );
}

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
        // Prevent the textarea from losing focus when the button is pressed —
        // we need the selection to stay live so wrap()/linePrefix() can read it.
        e.preventDefault();
        onClick();
      }}
      title={title}
      className="px-2 py-1 text-sm rounded hover:bg-gray-200 text-gray-700"
    >
      {children}
    </button>
  );
}
