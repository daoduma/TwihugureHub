// lib/useOfflineSync.ts
"use client";

import { useEffect, useCallback, useState } from "react";
import { syncPendingAttempts } from "@/lib/offlineStorage";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

export interface SyncState {
  isSyncing:    boolean;
  lastSynced:   Date | null;
  pendingCount: number;   // how many are still waiting (after last sync)
}

/**
 * Syncs pending offline quiz attempts when connectivity is restored.
 * Mount once at app level (DashboardShell). Returns sync state so the
 * UI can show a "syncing…" indicator.
 */
export function useOfflineSync(): SyncState {
  const isOnline = useOnlineStatus();
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [lastSynced,   setLastSynced]   = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const sync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const { synced, failed } = await syncPendingAttempts();
      setPendingCount(failed);
      if (synced > 0) setLastSynced(new Date());
    } catch {
      // Silent — will retry next time
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    // Try on mount (pending attempts from a previous offline session)
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Re-sync every time we come back online
    if (isOnline) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return { isSyncing, lastSynced, pendingCount };
}
