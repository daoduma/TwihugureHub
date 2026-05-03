// lib/useOfflineSync.ts
"use client";

import { useEffect, useCallback } from "react";
import { syncPendingAttempts } from "@/lib/offlineStorage";

/**
 * Syncs pending offline quiz attempts when connectivity is restored.
 * Mount this hook once at the app level (e.g., in DashboardShell).
 */
export function useOfflineSync() {
  const sync = useCallback(async () => {
    try {
      await syncPendingAttempts();
    } catch {
      // Silent fail — will retry next time
    }
  }, []);

  useEffect(() => {
    // Try sync on mount (in case there are pending attempts from a previous session)
    sync();

    // Re-sync whenever we come back online
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [sync]);
}
