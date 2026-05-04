// lib/offlineStorage.ts
// Offline lesson + quiz-attempt storage using IndexedDB.

const DB_NAME    = "twihugure-offline";
const DB_VERSION = 3; // v3: imageDataUrls + audioDataUrl for true offline media
const LESSONS_STORE       = "lessons";
const QUIZ_ATTEMPTS_STORE = "quiz_attempts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(LESSONS_STORE)) {
        db.createObjectStore(LESSONS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(QUIZ_ATTEMPTS_STORE)) {
        const store = db.createObjectStore(QUIZ_ATTEMPTS_STORE, {
          keyPath: "localId",
          autoIncrement: true,
        });
        store.createIndex("synced", "synced", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfflineLesson {
  id:          string;
  title:       Record<string, string>;
  body:        Record<string, string>;
  videoUrl?:   string | null;  // URL only — video files too large to embed
  audioUrl?:   string | null;  // original URL (kept as fallback)
  audioDataUrl?: string | null; // base64 data URL — works offline
  imageUrls:   string[];       // original URLs (kept as fallback)
  imageDataUrls?: string[];    // base64 data URLs — works offline
  courseId:    string;
  courseTitle: Record<string, string>;
  savedAt:     string;
}

export interface PendingQuizAttempt {
  localId?:    number;
  quizId:      string;
  farmerId:    string;
  answers: Array<{
    questionId:        string;
    selectedOptionId?: string;
    shortAnswerText?:  string;
  }>;
  languageUsed: string;
  startedAt:    string;
  completedAt:  string;
  synced:       boolean;
  syncError?:   string;
  retryCount?:  number;
}

// ─── Media download helpers ───────────────────────────────────────────────────

/**
 * Fetch a URL and return it as a base64 data URL.
 * Returns null on CORS failure, network error, or non-200 response.
 * Safe to call with any URL — never throws.
 */
export async function fetchAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Estimate storage in use by offline lessons (bytes).
 */
export async function estimateLessonStorageBytes(): Promise<number> {
  const lessons = await getAllLessons().catch(() => [] as OfflineLesson[]);
  return lessons.reduce((acc, l) => acc + JSON.stringify(l).length, 0);
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function saveLesson(lesson: OfflineLesson): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, "readwrite");
    tx.objectStore(LESSONS_STORE).put(lesson);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function getLesson(id: string): Promise<OfflineLesson | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(LESSONS_STORE, "readonly");
    const req = tx.objectStore(LESSONS_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

export async function getAllLessons(): Promise<OfflineLesson[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(LESSONS_STORE, "readonly");
    const req = tx.objectStore(LESSONS_STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror   = () => reject(req.error);
  });
}

export async function deleteLesson(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, "readwrite");
    tx.objectStore(LESSONS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function isLessonDownloaded(id: string): Promise<boolean> {
  return (await getLesson(id).catch(() => null)) !== null;
}

// ─── Quiz Attempts ────────────────────────────────────────────────────────────

export async function savePendingAttempt(
  attempt: Omit<PendingQuizAttempt, "localId">
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    tx.objectStore(QUIZ_ATTEMPTS_STORE).add({ ...attempt, retryCount: 0 });
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function getPendingAttempts(): Promise<PendingQuizAttempt[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(QUIZ_ATTEMPTS_STORE, "readonly");
    const req = tx.objectStore(QUIZ_ATTEMPTS_STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result ?? []).filter((a: PendingQuizAttempt) => !a.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSyncedAttempt(localId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    tx.objectStore(QUIZ_ATTEMPTS_STORE).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function markAttemptSynced(localId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    const store = tx.objectStore(QUIZ_ATTEMPTS_STORE);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const r = getReq.result;
      if (r) store.put({ ...r, synced: true });
    };
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function markAttemptFailed(localId: number, error: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    const store = tx.objectStore(QUIZ_ATTEMPTS_STORE);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const r = getReq.result;
      if (r) store.put({ ...r, syncError: error, retryCount: (r.retryCount ?? 0) + 1 });
    };
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

const MAX_RETRIES = 5;

export async function syncPendingAttempts(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };

  const pending = await getPendingAttempts().catch(() => [] as PendingQuizAttempt[]);
  let synced = 0, failed = 0;

  for (const attempt of pending) {
    if ((attempt.retryCount ?? 0) >= MAX_RETRIES) { failed++; continue; }
    try {
      const res = await fetch(`/api/farmer/quiz/${attempt.quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers:      attempt.answers,
          languageUsed: attempt.languageUsed,
          startedAt:    attempt.startedAt,
        }),
      });
      if (res.ok && attempt.localId !== undefined) {
        await deleteSyncedAttempt(attempt.localId);
        synced++;
      } else {
        if (attempt.localId !== undefined)
          await markAttemptFailed(attempt.localId, `HTTP ${res.status}`);
        failed++;
      }
    } catch (err) {
      if (attempt.localId !== undefined)
        await markAttemptFailed(attempt.localId, err instanceof Error ? err.message : "error");
      failed++;
    }
  }
  return { synced, failed };
}
