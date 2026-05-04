// components/pwa/InstallPrompt.tsx
"use client";

/**
 * Floating install-app prompt. Handles three platforms:
 *
 *  Android / desktop Chrome-Edge
 *    → "Install App" button that triggers the deferred BeforeInstallPromptEvent.
 *
 *  iOS Safari
 *    → Step-by-step sheet with an animation showing Share → Add to Home Screen.
 *      (iOS never fires beforeinstallprompt, so we can only give instructions.)
 *
 * Shown as a bottom sheet on mobile, a small floating card on desktop.
 * Remembers dismissal for 7 days via localStorage.
 */

import { useState } from "react";
import { X, Download, Share, Plus, Smartphone, Wifi, Zap, BookOpen } from "lucide-react";
import { usePWAInstall } from "@/lib/usePWAInstall";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";

// ─── iOS step-by-step sheet ───────────────────────────────────────────────────

function IOSInstructions({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-slide-up p-6 pb-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

          <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-brand-900/30">
            <img src="/icons/icon.svg" alt="TwihugureHub" className="h-16 w-16" />
          </div>
        </div>

        <h2 className="text-center text-lg font-bold text-gray-900 mb-1">
          {t("pwa.installTitle" as never) || "Install TwihugureHub"}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          {t("pwa.iosSubtitle" as never) || "Add to your home screen for offline access"}
        </p>

        {/* Steps */}
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              1
            </div>
            <div className="pt-0.5">
              <p className="text-sm text-gray-700">
                {t("pwa.iosStep1" as never) || "Tap the"}{" "}
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                  <Share size={11} />
                  {t("pwa.iosShareLabel" as never) || "Share"}
                </span>{" "}
                {t("pwa.iosStep1b" as never) || "button at the bottom of Safari"}
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              2
            </div>
            <div className="pt-0.5">
              <p className="text-sm text-gray-700">
                {t("pwa.iosStep2" as never) || "Scroll down and tap"}{" "}
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                  <Plus size={11} />
                  {t("pwa.iosAddLabel" as never) || "Add to Home Screen"}
                </span>
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              3
            </div>
            <div className="pt-0.5">
              <p className="text-sm text-gray-700">
                {t("pwa.iosStep3" as never) || "Tap"}{" "}
                <span className="font-semibold text-brand-700">
                  {t("pwa.iosAddConfirm" as never) || "Add"}
                </span>{" "}
                {t("pwa.iosStep3b" as never) || "in the top-right corner"}
              </p>
            </div>
          </li>
        </ol>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition-colors"
        >
          {t("pwa.gotIt" as never) || "Got it!"}
        </button>
      </div>
    </div>
  );
}

// ─── Main install banner ──────────────────────────────────────────────────────

export function InstallPrompt() {
  const { t } = useTranslation();
  const { canPrompt, platform, triggerInstall, dismiss } = usePWAInstall();
  const [showIOSSheet, setShowIOSSheet] = useState(false);
  const [installing,   setInstalling]   = useState(false);
  const [installed,    setInstalled]    = useState(false);

  if (!canPrompt) return null;

  if (installed) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[200] -translate-x-1/2 animate-fade-in">
        <div className="flex items-center gap-2.5 rounded-xl bg-green-600 px-5 py-3 text-white shadow-xl">
          <Smartphone size={18} />
          <span className="text-sm font-semibold">
            {t("pwa.installSuccess" as never) || "App installed! 🎉"}
          </span>
        </div>
      </div>
    );
  }

  // ── iOS: show a simple tap-to-open-instructions button ───────────────────
  if (platform === "ios") {
    return (
      <>
        {/* Floating bottom banner */}
        <div
          className={cn(
            "fixed bottom-4 left-4 right-4 z-[190] mx-auto max-w-sm",
            "rounded-2xl bg-white shadow-2xl border border-gray-100 animate-slide-up"
          )}
        >
          <div className="flex items-start gap-3 p-4">
            {/* Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden">
              <img src="/icons/icon.svg" alt="TwihugureHub" className="h-11 w-11" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                {t("pwa.installTitle" as never) || "Install TwihugureHub"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("pwa.installTagline" as never) || "Access your lessons offline, anytime"}
              </p>
            </div>

            <button
              onClick={dismiss}
              className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => setShowIOSSheet(true)}
              className="flex-1 rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={14} />
              {t("pwa.howToInstall" as never) || "How to install"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {t("pwa.notNow" as never) || "Later"}
            </button>
          </div>
        </div>

        {showIOSSheet && (
          <IOSInstructions
            onClose={() => {
              setShowIOSSheet(false);
              dismiss();
            }}
          />
        )}
      </>
    );
  }

  // ── Android / Desktop: one-click install ─────────────────────────────────
  const handleInstall = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalled(true);
    setInstalling(false);
    setTimeout(dismiss, 3000);
  };

  const isDesktop = platform === "desktop";

  return (
    <div
      className={cn(
        "fixed z-[190] animate-slide-up",
        isDesktop
          ? "bottom-6 right-6 max-w-xs"
          : "bottom-4 left-4 right-4 mx-auto max-w-sm"
      )}
    >
      <div className="rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 p-4 pb-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden">
              <img src="/icons/icon.svg" alt="TwihugureHub" className="h-11 w-11" />
            </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">
              {t("pwa.installTitle" as never) || "Install TwihugureHub"}
            </p>
            <p className="text-xs text-gray-500">
              {t("pwa.installTagline" as never) || "Access your lessons offline, anytime"}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>

        {/* Benefits */}
        <div className="px-4 pb-3 space-y-1.5">
          {[
            { icon: <Wifi size={13} />,     text: t("pwa.benefit1" as never) || "Read lessons without internet" },
            { icon: <Zap size={13} />,      text: t("pwa.benefit2" as never) || "Faster loading, no browser bar" },
            { icon: <BookOpen size={13} />, text: t("pwa.benefit3" as never) || "Works like a native app on any device" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="text-brand-500">{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex-1 rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {installing ? (
              <span className="animate-pulse">{t("pwa.installing" as never) || "Installing…"}</span>
            ) : (
              <>
                <Download size={14} />
                {t("pwa.installButton" as never) || "Install App"}
              </>
            )}
          </button>
          <button
            onClick={dismiss}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            {t("pwa.notNow" as never) || "Later"}
          </button>
        </div>
      </div>
    </div>
  );
}
