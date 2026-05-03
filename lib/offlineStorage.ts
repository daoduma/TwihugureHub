// lib/offlineStorage.ts
// Offline lesson storage using IndexedDB (idb-keyval compatible API)
// We use a manual IndexedDB implementation so we don't require a dependency
// at build time. For production, swap to idb-keyval or Dexie.js.

const DB_NAME = "twihugure-offline";
const DB_VERSION = 1;
const LESSONS_STORE = "lessons";
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
        store.createIndex("synced", "synced", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface OfflineLesson {
  id: string;
  title: Record<string, string>;
  body: Record<string, string>;
  videoUrl?: string | null;
  audioUrl?: string | null;
  imageUrls: string[];
  courseId: string;
  courseTitle: Record<string, string>;
  savedAt: string;
}

export interface PendingQuizAttempt {
  localId?: number;
  quizId: string;
  farmerId: string;
  answers: Array<{
    questionId: string;
    selectedOptionId?: string;
    shortAnswerText?: string;
  }>;
  languageUsed: string;
  startedAt: string;
  completedAt: string;
  synced: boolean;
  syncError?: string;
}

// ─── Lessons ────────────────────────────────────────────────────────────────

export async function saveLesson(lesson: OfflineLesson): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, "readwrite");
    tx.objectStore(LESSONS_STORE).put(lesson);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLesson(id: string): Promise<OfflineLesson | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, "readonly");
    const req = tx.objectStore(LESSONS_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllLessons(): Promise<OfflineLesson[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, "readonly");
    const req = tx.objectStore(LESSONS_STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLesson(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LESSONS_STORE, "readwrite");
    tx.objectStore(LESSONS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function isLessonDownloaded(id: string): Promise<boolean> {
  const lesson = await getLesson(id).catch(() => null);
  return lesson !== null;
}

// ─── Offline Quiz Attempts ────────────────────────────────────────────────────

export async function savePendingAttempt(attempt: Omit<PendingQuizAttempt, "localId">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    tx.objectStore(QUIZ_ATTEMPTS_STORE).add(attempt);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingAttempts(): Promise<PendingQuizAttempt[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUIZ_ATTEMPTS_STORE, "readonly");
    const req = tx.objectStore(QUIZ_ATTEMPTS_STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result ?? []).filter((a: PendingQuizAttempt) => !a.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function markAttemptSynced(localId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUIZ_ATTEMPTS_STORE, "readwrite");
    const store = tx.objectStore(QUIZ_ATTEMPTS_STORE);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.synced = true;
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Attempt to sync all pending quiz attempts to the server.
 * Call this on app load or when connectivity is restored.
 */
export async function syncPendingAttempts(): Promise<void> {
  if (!navigator.onLine) return;

  const pending = await getPendingAttempts().catch(() => [] as PendingQuizAttempt[]);
  for (const attempt of pending) {
    try {
      const res = await fetch(`/api/farmer/quiz/${attempt.quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: attempt.answers,
          languageUsed: attempt.languageUsed,
          startedAt: attempt.startedAt,
        }),
      });
      if (res.ok && attempt.localId !== undefined) {
        await markAttemptSynced(attempt.localId);
      }
    } catch {
      // Will retry on next sync
    }
  }
}
