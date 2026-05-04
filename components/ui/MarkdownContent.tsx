// components/ui/MarkdownContent.tsx
"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// Configure once. GFM gives us tables, strikethrough, task lists. `breaks: true`
// makes single newlines render as <br> which matches authoring intuition.
marked.use({
  gfm: true,
  breaks: true,
});

interface Props {
  source: string;
  className?: string;
}

/**
 * Renders Markdown safely. Existing HTML-authored lesson bodies still render
 * correctly because `marked` passes inline HTML through, and DOMPurify strips
 * anything dangerous (script tags, on* handlers, javascript: URLs, etc.).
 */
export function MarkdownContent({ source, className = "" }: Props) {
  const html = useMemo(() => {
    if (!source) return "";
    const raw = marked.parse(source, { async: false }) as string;
    return DOMPurify.sanitize(raw, {
      // Allow target/rel on links so external links can open in new tabs.
      ADD_ATTR: ["target", "rel"],
    });
  }, [source]);

  if (!html) return null;

  return (
    <div
      className={`prose prose-brand max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
