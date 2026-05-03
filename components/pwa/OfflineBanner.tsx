// components/pwa/OfflineBanner.tsx
"use client";

import { useState, useEffect } from "react";
import { WifiOff, X } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    function handleOffline() {
      setIsOffline(true);
      setDismissed(false);
    }
    function handleOnline() {
      setIsOffline(false);
      setDismissed(false);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 bg-amber-600 px-4 py-2.5 text-white shadow-md">
      <div className="flex items-center gap-2.5">
        <WifiOff size={16} className="shrink-0" />
        <span className="text-sm font-medium">{t("offline.banner")}</span>
        <span className="text-xs text-amber-100">{t("offline.bannerHint")}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-0.5 hover:bg-amber-700 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
