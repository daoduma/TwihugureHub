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

// Real per-type size limits (must match /api/upload/sign/route.ts MAX_SIZES)
const CLIENT_MAX_SIZES: Record<string, number> = {
  image:      10 * 1024 * 1024,  // 10 MB
  thumbnail:   5 * 1024 * 1024,  //  5 MB
  audio:      50 * 1024 * 1024,  // 50 MB
  attachment: 20 * 1024 * 1024,  // 20 MB — PDFs up to 20 MB supported
};

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
        // ── Client-side size guard ───────────────────────────────────────────
        const maxBytes = CLIENT_MAX_SIZES[type] ?? CLIENT_MAX_SIZES.image;
        if (file.size > maxBytes) {
          const maxMB = (maxBytes / 1024 / 1024).toFixed(0);
          throw new Error(`"${file.name}" is too large. Maximum size is ${maxMB} MB.`);
        }

        // ── Step 1: Ask the server for a signed Supabase upload URL ──────────
        // This is a tiny JSON request — no Vercel body-size limit concern.
        const signRes = await fetch("/api/upload/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            type,
          }),
        });

        const signJson = await signRes.json();
        if (!signJson.success) {
          throw new Error(signJson.error ?? "Could not get upload URL.");
        }

        const { signedUrl, publicUrl } = signJson.data;

        // ── Step 2: PUT the file directly to Supabase Storage ────────────────
        // This goes directly to Supabase CDN — Vercel is not involved at all,
        // so there is no 4.5 MB serverless body-size restriction.
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed (HTTP ${uploadRes.status}). Please try again.`);
        }

        // ── Step 3: Hand the public URL back to the parent ───────────────────
        onUploaded(publicUrl, file.name, file.type || "application/octet-stream");

        if (!multiple) break;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
      // Reset the input so the same file can be re-selected after an error
      if (inputRef.current) inputRef.current.value = "";
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
        className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-700 transition-colors w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {loading ? "Uploading…" : label ? `Upload ${label}` : "Upload file"}
      </button>

      {error && (
        <p className="text-xs text-red-600 flex items-start gap-1">
          <span className="mt-0.5">⚠</span>
          <span>{error}</span>
        </p>
      )}

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
