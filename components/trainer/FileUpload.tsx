// components/trainer/FileUpload.tsx
"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface FileUploadProps {
  label?: string;
  accept?: string;
  type?: "image" | "audio" | "attachment" | "thumbnail";
  currentUrl?: string | null;
  onUploaded: (url: string, fileName: string, fileType: string) => void;
  onRemove?: () => void;
  multiple?: boolean;
}

// Max sizes per upload type — must match the server-side MAX_SIZES in /api/upload/route.ts
const CLIENT_MAX_SIZES: Record<string, number> = {
  image:      10 * 1024 * 1024,
  thumbnail:   5 * 1024 * 1024,
  audio:      50 * 1024 * 1024,
  attachment: 20 * 1024 * 1024,
};
// Vercel's hard cap on multipart bodies (applies before our route even runs)
const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024;

export function FileUpload({
  label,
  accept,
  type = "image",
  currentUrl,
  onUploaded,
  onRemove,
  multiple = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: FileList) => {
    setError(null);
    setLoading(true);
    try {
      for (const file of Array.from(files)) {
        // ── Client-side size guard ──────────────────────────────────────────
        // Vercel rejects multipart bodies over 4.5 MB before our API route runs,
        // returning an HTML "Request Entity Too Large" page that breaks res.json().
        // Catch oversized files here with a friendly message before the upload starts.
        const typeLimit = CLIENT_MAX_SIZES[type] ?? CLIENT_MAX_SIZES.image;
        const effectiveLimit = Math.min(typeLimit, VERCEL_BODY_LIMIT);
        if (file.size > effectiveLimit) {
          const limitMB = (effectiveLimit / 1024 / 1024).toFixed(1);
          throw new Error(`"${file.name}" is too large. Maximum size is ${limitMB} MB.`);
        }

        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", type);
        const res = await fetch("/api/upload", { method: "POST", body: fd });

        // Guard: if the response is not JSON (e.g. Vercel 413 "Request Entity Too Large"
        // returns an HTML page), calling res.json() throws a cryptic parse error.
        // Check Content-Type first and handle it gracefully.
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          if (res.status === 413) {
            throw new Error("File is too large. Please upload a smaller file (max 4.5 MB).");
          }
          throw new Error(`Upload failed (HTTP ${res.status}). Please try again.`);
        }

        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        onUploaded(json.data.url, json.data.fileName, json.data.fileType);
        if (!multiple) break;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      {currentUrl && type === "thumbnail" && (
        <div className="relative w-32 h-20 rounded overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt="thumbnail" className="w-full h-full object-cover" />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {currentUrl && type !== "thumbnail" && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
          <span className="truncate flex-1">{currentUrl.split("/").pop()}</span>
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-700 transition-colors w-full justify-center"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {loading ? "Uploading…" : label ? `Upload ${label}` : "Upload file"}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files?.length && handleUpload(e.target.files)}
      />
    </div>
  );
}
