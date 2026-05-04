// lib/useOnlineStatus.ts
"use client";

/**
 * Shared hook for online/offline detection.
 * Single source of truth — avoids duplicating addEventListener("online/offline")
 * in every component.
 */

import { useState, useEffect } from "react";

export function useOnlineStatus(): boolean {
  // Start with the real value; default true for SSR (window not available)
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    // Sync with the real value on mount (handles SSR mismatch)
    setOnline(navigator.onLine);

    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
