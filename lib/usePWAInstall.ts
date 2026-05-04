// lib/usePWAInstall.ts
"use client";

/**
 * PWA install lifecycle hook.
 *
 * THE TIMING PROBLEM:
 *   `beforeinstallprompt` fires early in the page load — before React hydrates
 *   and any useEffect runs. A naive addEventListener inside useEffect misses it.
 *
 * THE FIX:
 *   Capture the event at *module load time* (a plain window.addEventListener at
 *   the top level of this module). Modules are evaluated once, synchronously,
 *   before React even starts. The captured event is stored in a module-level
 *   variable and handed to the hook on first render.
 */

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Navigator { standalone?: boolean; }
}

// ─── Module-level early capture ───────────────────────────────────────────────
// This runs synchronously the moment the module is first imported — before
// React hydrates, before any useEffect, before anything else. This is the ONLY
// reliable way to catch beforeinstallprompt.

let _capturedPrompt: BeforeInstallPromptEvent | null = null;
let _installed = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // stop the browser's own mini-infobar
    _capturedPrompt = e as BeforeInstallPromptEvent;
    // Dispatch a custom event so any already-mounted hook can react
    window.dispatchEvent(new CustomEvent("pwa-prompt-ready"));
  });

  window.addEventListener("appinstalled", () => {
    _installed = true;
    _capturedPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type InstallPlatform =
  | "android"
  | "ios"
  | "desktop"
  | "already-installed"
  | "unsupported";

export interface PWAInstallState {
  canPrompt:      boolean;
  platform:       InstallPlatform;
  isDismissed:    boolean;
  isInstalled:    boolean;
  triggerInstall: () => Promise<void>;
  dismiss:        () => void;
  markInstalled:  () => void;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const SNOOZE_KEY    = "pwa-install-snoozed-until";
const INSTALLED_KEY = "pwa-install-done";
const SNOOZE_DAYS   = 7;

function getSnoozedUntil(): number {
  try { return parseInt(localStorage.getItem(SNOOZE_KEY) ?? "0", 10) || 0; }
  catch { return 0; }
}
function isPermanentlyDone(): boolean {
  try { return localStorage.getItem(INSTALLED_KEY) === "1"; }
  catch { return false; }
}
function setInstalledFlag() {
  try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
}
function setSnoozeFlag() {
  try {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, String(until));
  } catch {}
}

// ─── Platform detection ───────────────────────────────────────────────────────

function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function detectPlatform(): InstallPlatform {
  if (isStandaloneMode()) return "already-installed";

  const ua = navigator.userAgent;

  // iOS Safari (not Chrome/Firefox on iOS — those can't install PWAs)
  if (
    /iphone|ipad|ipod/i.test(ua) &&
    /safari/i.test(ua) &&
    !/crios|fxios|opios|mercury/i.test(ua)
  ) return "ios";

  // Android or desktop — will receive beforeinstallprompt
  return /android|mobile/i.test(ua) ? "android" : "desktop";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// Read dismiss/installed state synchronously so the first render is correct.
// This avoids the flash where canPrompt is always false until useEffect runs.
function getInitialDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (localStorage.getItem(INSTALLED_KEY) === "1") return true;
    const snoozedUntil = parseInt(localStorage.getItem(SNOOZE_KEY) ?? "0", 10) || 0;
    if (Date.now() < snoozedUntil) return true;
  } catch {}
  return false;
}

function getInitialInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1" || _installed;
  } catch {}
  return false;
}

export function usePWAInstall(): PWAInstallState {
  const [prompt,      setPrompt]      = useState<BeforeInstallPromptEvent | null>(_capturedPrompt);
  const [platform,    setPlatform]    = useState<InstallPlatform>("unsupported");
  const [isDismissed, setIsDismissed] = useState(getInitialDismissed);
  const [isInstalled, setIsInstalled] = useState(getInitialInstalled);

  useEffect(() => {
    // ── Detect platform ──────────────────────────────────────────────────────
    const p = detectPlatform();
    setPlatform(p);

    if (p === "already-installed" || isPermanentlyDone()) {
      setIsInstalled(true);
      setIsDismissed(true);
      return;
    }

    // ── Pick up the module-level captured prompt (may already be set) ────────
    if (_capturedPrompt) setPrompt(_capturedPrompt);

    // ── Also listen for the custom event in case the prompt fires later ──────
    const onPromptReady = () => setPrompt(_capturedPrompt);
    const onInstalled   = () => {
      setIsInstalled(true);
      setIsDismissed(true);
      setInstalledFlag();
    };

    window.addEventListener("pwa-prompt-ready", onPromptReady);
    window.addEventListener("pwa-installed",    onInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-ready", onPromptReady);
      window.removeEventListener("pwa-installed",    onInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsDismissed(true);
      setInstalledFlag();
    }
    setPrompt(null);
    _capturedPrompt = null;
  }, [prompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setSnoozeFlag();
  }, []);

  const markInstalled = useCallback(() => {
    setIsInstalled(true);
    setIsDismissed(true);
    setInstalledFlag();
  }, []);

  const canPrompt =
    !isInstalled &&
    !isDismissed &&
    (platform === "ios" || platform === "android" || platform === "desktop") &&
    (platform === "ios" || prompt !== null);

  return { canPrompt, platform, isDismissed, isInstalled, triggerInstall, dismiss, markInstalled };
}
