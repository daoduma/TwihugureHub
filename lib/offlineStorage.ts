// lib/offlineStorage.ts
// Offline lesson + quiz-attempt storage using a manual IndexedDB wrapper.

const DB_NAME    = "twihugure-offline";
const DB_VERSION = 2; // bumped: added syncError field + cleanup support
const LESSONS_STORE      = "lessons";
const QUIZ_ATTEMPTS_STORE = "quiz_attempts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(LESSONS_STORE)) {
        db.createObjectStore(LESSONS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(QUIZ_ATTEMPTS_STORE)) {
        const store = db.createObjectStore(QUIZ_ATTEMPTS_STORE, {
          keyPath: "localId",
          autoIncrement: true,
        });
        store.createIndex("synced",  "synced",  { unique: false });
        store.createIndex("quizId",  "quizId",  { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror  = () => reject(request.error);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfflineLesson {
  id: string;
  title:      Record<string, string>;
  body:       Record<string, string>;
  videoUrl?:  string | null;
  audioUrl?:  string | null;
  imageUrls:  string[];
  courseId:   string;
  courseTitle: Record<string, string>;
  savedAt:    string;
}

export interface PendingQuizAttempt {
  localId?:    number;
  quizId:      string;
  farmerId:    string;
  answers: Array<{
    questionId:       string;
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
  const lesson = await getLesson(id).catch(() => null);
  return lesson !== null;
}

/**
 * Estimate how many bytes the offline lessons are consuming.
 * Returns bytes.
 */
export async function estimateLessonStorageBytes(): Promise<number> {
  const lessons = await getAllLessons().catch(() => [] as OfflineLesson[]);
  return lessons.reduce((acc, l) => acc + JSON.stringify(l).length, 0);
}

// ─── Offline Quiz Attempts ────────────────────────────────────────────────────

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

/** Delete a synced attempt permanently (keeps the DB tidy). */
export async function deleteSyncedAttempt(localId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    tx.objectStore(QUIZ_ATTEMPTS_STORE).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Mark an attempt as synced in-place (kept for backwards compat). */
export async function markAttemptSynced(localId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    const store = tx.objectStore(QUIZ_ATTEMPTS_STORE);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) store.put({ ...record, synced: true });
    };
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Update an attempt's syncError and retryCount. */
async function markAttemptFailed(localId: number, error: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    const store = tx.objectStore(QUIZ_ATTEMPTS_STORE);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        store.put({
          ...record,
          syncError:  error,
          retryCount: (record.retryCount ?? 0) + 1,
        });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

const MAX_RETRIES = 5;

/**
 * Sync all pending (unsynced) quiz attempts to the server.
 * Deletes attempts that succeed. Tracks retries and stops after MAX_RETRIES.
 * Call on app load or when connectivity is restored.
 */
export async function syncPendingAttempts(): Promise<{
  synced: number;
  failed: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingAttempts().catch(() => [] as PendingQuizAttempt[]);
  let synced = 0;
  let failed = 0;

  for (const attempt of pending) {
    // Skip attempts that have exceeded the retry limit
    if ((attempt.retryCount ?? 0) >= MAX_RETRIES) {
      failed++;
      continue;
    }

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
        // Delete on success to keep DB tidy
        await deleteSyncedAttempt(attempt.localId);
        synced++;
      } else {
        const msg = `HTTP ${res.status}`;
        if (attempt.localId !== undefined) await markAttemptFailed(attempt.localId, msg);
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "network error";
      if (attempt.localId !== undefined) await markAttemptFailed(attempt.localId, msg);
      failed++;
    }
  }

  return { synced, failed };
}
