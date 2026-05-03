"use client";
// app/(dashboard)/admin/approvals/page.tsx

import { useState, useEffect } from "react";

interface Trainer { id: string; name: string; email: string; }
interface Course {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  availableLanguages: string[];
  updatedAt: string;
  trainer: Trainer;
  modules: Array<{
    id: string;
    title: Record<string, string>;
    lessons: Array<{
      id: string;
      title: Record<string, string>;
      body: Record<string, string>;
    }>;
  }>;
}

function RejectModal({ courseId, onClose, onDone }: { courseId: string; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    await fetch(`/api/admin/approvals/${courseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "REJECTED", notes }),
    });
    setLoading(false);
    onDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Reject Course</h2>
        <p className="text-sm text-gray-500 mb-4">Please provide feedback for the trainer explaining why this course was rejected.</p>
        <textarea
          className="input w-full h-28 resize-none"
          placeholder="Rejection notes (required)…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleReject} disabled={loading || !notes.trim()} className="flex-1 rounded-xl bg-red-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {loading ? "Rejecting…" : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoursePreview({ course, onClose, onApprove, onReject }: {
  course: Course; onClose: () => void; onApprove: () => void; onReject: () => void;
}) {
  const title = course.title.en ?? Object.values(course.title)[0] ?? "Untitled";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded px-2 py-0.5 mb-2 inline-block">PENDING REVIEW</span>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">By {course.trainer.name} · {course.availableLanguages.join(", ").toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-4">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</h3>
            <p className="text-sm text-gray-700">{course.description.en ?? Object.values(course.description)[0]}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Modules ({course.modules.length})</h3>
            <div className="space-y-3">
              {course.modules.map((mod, mi) => (
                <div key={mod.id} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Module {mi + 1}: {mod.title.en ?? Object.values(mod.title)[0]}
                  </p>
                  <div className="mt-2 space-y-1">
                    {mod.lessons.map((lesson, li) => (
                      <div key={lesson.id} className="text-xs text-gray-600 pl-3 border-l-2 border-gray-100">
                        <span className="font-medium">Lesson {li + 1}:</span>{" "}
                        {lesson.title.en ?? Object.values(lesson.title)[0]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onReject} className="flex-1 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2.5 text-sm font-semibold hover:bg-red-100">
            ✗ Reject
          </button>
          <button onClick={onApprove} className="flex-1 rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-green-700">
            ✓ Approve & Publish
          </button>
        </div>
      </div>
    </div>
  );
}


export default function ApprovalsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Course | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/approvals");
    const data = await res.json();
    setCourses(data.courses ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleApprove = async (courseId: string) => {
    await fetch(`/api/admin/approvals/${courseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "APPROVED", notes: "Approved by admin." }),
    });
    setPreview(null);
    fetchCourses();
  };

  const LANG_COLORS: Record<string, string> = {
    en: "bg-blue-100 text-blue-700",
    fr: "bg-purple-100 text-purple-700",
    rw: "bg-green-100 text-green-700",
  };

  return (
    <div className="animate-fade-in space-y-5">
      {preview && (
        <CoursePreview
          course={preview}
          onClose={() => setPreview(null)}
          onApprove={() => handleApprove(preview.id)}
          onReject={() => { setRejectId(preview.id); setPreview(null); }}
        />
      )}
      {rejectId && (
        <RejectModal
          courseId={rejectId}
          onClose={() => setRejectId(null)}
          onDone={fetchCourses}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Content Approval Queue
        </h1>
        <p className="text-sm text-gray-500">
          {loading ? "Loading…" : `${courses.length} course${courses.length !== 1 ? "s" : ""} pending review`}
        </p>
      </div>

      {!loading && courses.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-gray-800">All caught up!</h2>
          <p className="text-sm text-gray-400 mt-1">No courses awaiting approval.</p>
        </div>
      )}

      <div className="space-y-3">
        {courses.map(course => {
          const title = course.title.en ?? Object.values(course.title)[0] ?? "Untitled";
          return (
            <div key={course.id} className="card p-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  By <span className="font-medium">{course.trainer.name}</span>
                  {" · "}Submitted {new Date(course.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {course.availableLanguages.map(lang => (
                    <span key={lang} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LANG_COLORS[lang] ?? "bg-gray-100 text-gray-600"}`}>
                      {lang.toUpperCase()}
                    </span>
                  ))}
                  <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs">
                    {course.modules.length} modules
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setPreview(course)} className="btn-secondary text-sm py-2 px-4">Preview</button>
                <button onClick={() => { setRejectId(course.id); }} className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm font-medium hover:bg-red-100">✗</button>
                <button onClick={() => handleApprove(course.id)} className="rounded-xl bg-green-600 text-white px-3 py-2 text-sm font-semibold hover:bg-green-700">✓ Approve</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
