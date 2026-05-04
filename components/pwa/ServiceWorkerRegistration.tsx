// components/pwa/ServiceWorkerRegistration.tsx
// next-pwa auto-registers the SW via a webpack plugin, but that mechanism
// relies on pages/_document.js which doesn't exist in Next.js App Router.
// This component provides a safe fallback that explicitly registers /sw.js
// on the client. Calling register() on an already-registered SW is a no-op,
// so this is always safe to run alongside next-pwa's own registration.
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for updates on every page load
        reg.update().catch(() => {});
      })
      .catch((err) => {
        // SW not present yet (dev build, first deploy) — non-fatal
        console.warn("[SW] Registration skipped:", err?.message ?? err);
      });
  }, []);

  return null;
}
