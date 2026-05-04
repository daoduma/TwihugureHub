// components/pwa/OfflineBanner.tsx
"use client";

import { WifiOff, RefreshCw, CheckCircle, X } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { useState, useEffect } from "react";

interface Props {
  isSyncing:  boolean;
  pendingCount: number;
  lastSynced: Date | null;
}

export function OfflineBanner({ isSyncing, pendingCount, lastSynced }: Props) {
  const { t } = useTranslation();
  const isOnline  = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  // Show a brief "back online" confirmation
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && !dismissed) {
      setJustReconnected(true);
      setDismissed(false);
      const timer = setTimeout(() => setJustReconnected(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Reset dismissed when going offline again
  useEffect(() => {
    if (!isOnline) setDismissed(false);
  }, [isOnline]);

  // "Back online" toast — auto-hides after 4 s
  if (justReconnected && isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 animate-fade-in">
        <div className="flex items-center gap-2.5 rounded-xl bg-green-600 px-4 py-2.5 text-white shadow-lg">
          <CheckCircle size={15} className="shrink-0" />
          <span className="text-sm font-medium">
            {isSyncing
              ? (t("offline.syncing" as never) || "Back online — syncing…")
              : pendingCount === 0
              ? (t("offline.backOnline" as never) || "Back online!")
              : (t("offline.syncedPartial" as never) || `Back online — ${pendingCount} quiz attempt(s) still pending`)}
          </span>
        </div>
      </div>
    );
  }

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 bg-amber-600 px-4 py-2.5 text-white shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        {isSyncing ? (
          <RefreshCw size={15} className="shrink-0 animate-spin" />
        ) : (
          <WifiOff size={15} className="shrink-0" />
        )}
        <span className="text-sm font-medium">{t("offline.banner")}</span>
        <span className="hidden text-xs text-amber-100 sm:inline">{t("offline.bannerHint")}</span>
        {pendingCount > 0 && (
          <span className="text-xs text-amber-100">
            · {pendingCount} {t("offline.pendingAttempts" as never) || "quiz attempt(s) will sync when reconnected"}
          </span>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-0.5 hover:bg-amber-700 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
