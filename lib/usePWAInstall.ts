// lib/usePWAInstall.ts
"use client";

/**
 * Manages the full PWA install lifecycle:
 *   - Captures the browser's BeforeInstallPromptEvent (Android / desktop Chrome/Edge)
 *   - Detects iOS Safari (no prompt available — needs manual steps)
 *   - Detects already-installed standalone mode
 *   - Persists dismissal to localStorage (7-day snooze / permanent after install)
 */

import { useState, useEffect, useCallback } from "react";

// Extend Window for the non-standard iOS standalone property
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

// Chrome/Edge fire this before showing the mini-infobar
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "android" | "ios" | "desktop" | "already-installed" | "unsupported";

export interface PWAInstallState {
  /** True when there is something to show the user */
  canPrompt: boolean;
  /** Which platform/flow to use */
  platform: InstallPlatform;
  /** Whether the user snoozed the prompt */
  isDismissed: boolean;
  /** Whether the app is already installed (standalone) */
  isInstalled: boolean;
  /** Trigger the native install dialog (Android / desktop) */
  triggerInstall: () => Promise<void>;
  /** Snooze for 7 days */
  dismiss: () => void;
  /** Mark as permanently done (called after user installs) */
  markInstalled: () => void;
}

const SNOOZE_KEY    = "pwa-install-snoozed-until";
const INSTALLED_KEY = "pwa-install-done";
const SNOOZE_DAYS   = 7;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function getSnoozedUntil(): number {
  try {
    return parseInt(localStorage.getItem(SNOOZE_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function isPermanentlyDone(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "unsupported";
  const ua = navigator.userAgent;

  if (isStandalone()) return "already-installed";

  // iOS Safari — must check before generic mobile check
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafariiOS =
    isIOS &&
    /safari/i.test(ua) &&
    !/crios|fxios|opios|mercury/i.test(ua); // not Chrome/Firefox on iOS

  if (isSafariiOS) return "ios";

  // Android or desktop with Chrome/Edge — will get beforeinstallprompt
  // We return "android" for mobile, "desktop" for desktop
  const isMobile = /android|mobile/i.test(ua);
  if (isMobile) return "android";

  return "desktop";
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform,    setPlatform]    = useState<InstallPlatform>("unsupported");
  const [isDismissed, setIsDismissed] = useState(true); // start hidden
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    if (p === "already-installed") {
      setIsInstalled(true);
      return;
    }

    if (isPermanentlyDone()) {
      setIsInstalled(true);
      return;
    }

    // Check snooze
    const snoozedUntil = getSnoozedUntil();
    if (Date.now() < snoozedUntil) {
      setIsDismissed(true);
      return;
    }

    // Not dismissed — allow showing
    setIsDismissed(false);

    // Listen for Chrome/Edge install event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    const installedHandler = () => {
      setIsInstalled(true);
      setIsDismissed(true);
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsDismissed(true);
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(SNOOZE_KEY, String(until));
    } catch {}
  }, []);

  const markInstalled = useCallback(() => {
    setIsInstalled(true);
    setIsDismissed(true);
    try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
  }, []);

  // Can we show any install UI at all?
  const canPrompt =
    !isInstalled &&
    !isDismissed &&
    (platform === "ios" || platform === "android" || platform === "desktop") &&
    // For Android/desktop we need the deferred prompt OR it's iOS (which never fires one)
    (platform === "ios" || deferredPrompt !== null);

  return {
    canPrompt,
    platform,
    isDismissed,
    isInstalled,
    triggerInstall,
    dismiss,
    markInstalled,
  };
}
