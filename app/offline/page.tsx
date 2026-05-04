// app/offline/page.tsx
// Served by the service worker when a navigation request fails completely
// (i.e., neither the network nor the cache can satisfy it).
"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, BookOpen } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-100">
            <WifiOff size={44} className="text-amber-500" />
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">You're offline</h1>
          <p className="mt-2 text-sm text-gray-500">
            This page isn't available without an internet connection. Check your
            connection and try again, or read one of your downloaded lessons.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <Link
            href="/farmer/offline-lessons"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors"
          >
            <BookOpen size={15} />
            Downloaded lessons
          </Link>
        </div>

        {/* Branding */}
        <p className="text-xs text-gray-400">TwihugureHub — Agricultural Training Platform</p>
      </div>
    </div>
  );
}
