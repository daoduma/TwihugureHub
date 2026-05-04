// components/ui/VideoPlayer.tsx
"use client";

/**
 * Unified video player that handles:
 *   • YouTube watch?v=  →  iframe embed
 *   • YouTube youtu.be/ →  iframe embed
 *   • YouTube /shorts/  →  iframe embed (landscape-cropped)
 *   • YouTube /live/    →  iframe embed
 *   • Already-embedded  →  iframe embed (pass-through)
 *   • Everything else   →  native <video> element
 *
 * Also shows a branded placeholder before the video loads.
 */

import { useState } from "react";
import { Play, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  url: string;
  className?: string;
  /** Provide to show a thumbnail before the user clicks play */
  thumbnailUrl?: string;
  title?: string;
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

type ParsedVideo =
  | { kind: "youtube"; videoId: string; startSeconds?: number }
  | { kind: "native"; url: string };

function parseVideoUrl(raw: string): ParsedVideo {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { kind: "native", url: raw };
  }

  const host = u.hostname.replace(/^www\./, "");

  // youtube.com/watch?v=ID
  if (host === "youtube.com" && u.pathname === "/watch") {
    const v = u.searchParams.get("v");
    const t = u.searchParams.get("t");
    if (v) return { kind: "youtube", videoId: v, startSeconds: t ? parseInt(t) : undefined };
  }

  // youtu.be/ID
  if (host === "youtu.be") {
    const v = u.pathname.slice(1);
    const t = u.searchParams.get("t");
    if (v) return { kind: "youtube", videoId: v, startSeconds: t ? parseInt(t) : undefined };
  }

  // youtube.com/shorts/ID
  if (host === "youtube.com" && u.pathname.startsWith("/shorts/")) {
    const v = u.pathname.replace("/shorts/", "");
    if (v) return { kind: "youtube", videoId: v };
  }

  // youtube.com/live/ID
  if (host === "youtube.com" && u.pathname.startsWith("/live/")) {
    const v = u.pathname.replace("/live/", "");
    if (v) return { kind: "youtube", videoId: v };
  }

  // Already an embed URL: youtube.com/embed/ID
  if (host === "youtube.com" && u.pathname.startsWith("/embed/")) {
    const v = u.pathname.replace("/embed/", "");
    if (v) return { kind: "youtube", videoId: v };
  }

  // youtube-nocookie.com/embed/ID
  if (host === "youtube-nocookie.com" && u.pathname.startsWith("/embed/")) {
    const v = u.pathname.replace("/embed/", "");
    if (v) return { kind: "youtube", videoId: v };
  }

  return { kind: "native", url: raw };
}

function buildEmbedUrl(videoId: string, startSeconds?: number): string {
  const params = new URLSearchParams({
    rel: "0",          // no related videos from other channels
    modestbranding: "1",
    playsinline: "1",
    ...(startSeconds ? { start: String(startSeconds) } : {}),
  });
  // Use youtube-nocookie for privacy
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

function buildThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function YoutubePlaceholder({
  videoId,
  title,
  onPlay,
}: {
  videoId: string;
  title?: string;
  onPlay: () => void;
}) {
  const thumb = buildThumbnailUrl(videoId);
  const [thumbError, setThumbError] = useState(false);

  return (
    <button
      onClick={onPlay}
      className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-black focus:outline-none"
      aria-label={title ? `Play ${title}` : "Play video"}
    >
      {/* Thumbnail */}
      {!thumbError ? (
        <img
          src={thumb}
          alt={title ?? "Video thumbnail"}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setThumbError(true)}
        />
      ) : (
        // Gradient fallback when YouTube thumbnail is unavailable
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700" />
      )}

      {/* Dark scrim */}
      <div className="absolute inset-0 bg-black/30 transition-opacity duration-200 group-hover:bg-black/20" />

      {/* YouTube-styled play button */}
      <div className="relative flex h-16 w-24 items-center justify-center rounded-2xl bg-[#FF0000] shadow-xl transition-all duration-200 group-hover:scale-110 group-hover:shadow-2xl">
        <Play size={28} fill="white" className="ml-1 text-white" />
      </div>

      {/* Title badge */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
          <p className="flex items-center gap-1.5 text-sm font-medium text-white line-clamp-1">
            <Youtube size={14} className="shrink-0 text-[#FF0000]" />
            {title}
          </p>
        </div>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VideoPlayer({ url, className, thumbnailUrl, title }: VideoPlayerProps) {
  const parsed = parseVideoUrl(url);
  const [playing, setPlaying] = useState(false);

  const wrapperCls = cn(
    "relative w-full overflow-hidden rounded-xl bg-black shadow-md",
    // 16:9 aspect ratio
    "aspect-video",
    className
  );

  // ── YouTube ──────────────────────────────────────────────────────────────────
  if (parsed.kind === "youtube") {
    const embedUrl = buildEmbedUrl(parsed.videoId, parsed.startSeconds);
    // autoplay=1 only when user explicitly clicks the placeholder
    const autoplayUrl = embedUrl + "&autoplay=1";

    return (
      <div className={wrapperCls}>
        {!playing ? (
          <YoutubePlaceholder
            videoId={parsed.videoId}
            title={title}
            onPlay={() => setPlaying(true)}
          />
        ) : (
          <iframe
            src={autoplayUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={title ?? "Lesson video"}
          />
        )}
      </div>
    );
  }

  // ── Native video ─────────────────────────────────────────────────────────────
  return (
    <div className={wrapperCls}>
      <video
        controls
        className="absolute inset-0 h-full w-full"
        src={parsed.url}
        poster={thumbnailUrl}
        preload="metadata"
      >
        Your browser does not support HTML5 video.
      </video>
    </div>
  );
}

/**
 * Lightweight helper — returns true if a URL looks like a YouTube link.
 * Use this to decide whether to show a "YouTube" badge in the trainer UI.
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com";
  } catch {
    return false;
  }
}
