"use client";
// app/(dashboard)/mbaza/farmers/[farmerId]/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Quiz { id: string; attempts: Array<{ attemptNumber: number; score: number; passed: boolean; languageUsed: string; startedAt: string; completedAt: string | null }>; }
interface Lesson { id: string; title: Record<string, string>; progress: Array<{ completedAt: string | null }>; quiz: Quiz | null; }
interface Module { id: string; title: Record<string, string>; lessons: Lesson[]; order: number; }
interface Course { id: string; title: Record<string, string>; }
interface Enrollment { id: string; enrolledAt: string; completedAt: string | null; progressPercent: number; course: Course & { modules: Module[] }; }
interface FarmerNote { id: string; body: string; createdAt: string; author: { name: string; role: string }; }
interface InterventionFlag { id: string; flagType: string; isResolved: boolean; createdAt: string; course: { id: string; title: Record<string, string> } | null; }
interface FarmerDetail {
  id: string; name: string; email: string; preferredLanguage: string; createdAt: string;
  groupMemberships: Array<{ group: { id: string; name: string; region: string | null } }>;
  enrollments: Enrollment[];
  farmerNotes: FarmerNote[];
  interventionFlags: InterventionFlag[];
}

const FLAG_LABELS: Record<string, string> = { FLAG_INACTIVE: "Inactive 14d+", FLAG_FAILING: "Failing Quizzes", FLAG_STALLED: "Stalled (<20%)" };
const FLAG_COLORS: Record<string, string> = { FLAG_INACTIVE: "bg-yellow-100 text-yellow-700", FLAG_FAILING: "bg-red-100 text-red-700", FLAG_STALLED: "bg-orange-100 text-orange-700" };

export default function FarmerDetailPage() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);

  const fetchFarmer = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/mbaza/farmers/${farmerId}`);
    const data = await res.json();
    setFarmer(data.farmer ?? null);
    setLoading(false);
  }, [farmerId]);

  useEffect(() => { fetchFarmer(); }, [fetchFarmer]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch(`/api/mbaza/farmers/${farmerId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setNoteText("");
    setAddingNote(false);
    fetchFarmer();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading farmer profile…</div>;
  if (!farmer) return <div className="text-red-500 p-8">Farmer not found.</div>;

  const activeFlags = farmer.interventionFlags.filter(f => !f.isResolved);

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      {/* Back */}
      <Link href="/mbaza/farmers" className="text-sm text-brand-600 hover:underline">← Back to Farmer List</Link>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{farmer.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{farmer.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-semibold">FARMER</span>
              <span className="rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-semibold uppercase">{farmer.preferredLanguage}</span>
              {farmer.groupMemberships.map(m => (
                <span key={m.group.id} className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-semibold">
                  📍 {m.group.name}{m.group.region ? ` · ${m.group.region}` : ""}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Joined {new Date(farmer.createdAt).toLocaleDateString()}</p>
          </div>

          {/* Active flags */}
          {activeFlags.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 min-w-[160px]">
              <p className="text-xs font-bold text-red-700 mb-2">🚩 Active Flags ({activeFlags.length})</p>
              {activeFlags.map(f => (
                <div key={f.id} className={`rounded px-2 py-0.5 text-[10px] font-bold mb-1 ${FLAG_COLORS[f.flagType]}`}>
                  {FLAG_LABELS[f.flagType] ?? f.flagType}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enrollments */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Course Enrollments ({farmer.enrollments.length})</h2>
        {farmer.enrollments.length === 0 && <p className="text-sm text-gray-400">No courses enrolled.</p>}
        <div className="space-y-3">
          {farmer.enrollments.map(enrollment => {
            const title = (enrollment.course.title as Record<string, string>).en ?? "Untitled";
            const allAttempts = enrollment.course.modules.flatMap(m => m.lessons.flatMap(l => l.quiz?.attempts ?? []));
            const aiTranslated = allAttempts.some(a => a.languageUsed === "rw");
            const isExpanded = expandedEnrollment === enrollment.id;

            return (
              <div key={enrollment.id} className="rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpandedEnrollment(isExpanded ? null : enrollment.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{title}</p>
                      {aiTranslated && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700">
                          🤖 AI-Translated Quiz (rw)
                        </span>
                      )}
                      {enrollment.completedAt && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700">✓ Completed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-24 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${enrollment.progressPercent}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{enrollment.progressPercent}%</span>
                      </div>
                      <span className="text-xs text-gray-400">Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="text-gray-300 ml-3">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    {enrollment.course.modules.map(mod => (
                      <div key={mod.id}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                          Module: {(mod.title as Record<string, string>).en ?? "Untitled"}
                        </p>
                        <div className="space-y-2">
                          {mod.lessons.map(lesson => {
                            const lessonDone = lesson.progress.some(p => p.completedAt);
                            const attempts = lesson.quiz?.attempts ?? [];
                            return (
                              <div key={lesson.id} className="rounded-lg bg-white border border-gray-100 p-3">
                                <div className="flex items-center gap-2">
                                  <span>{lessonDone ? "✅" : "⏳"}</span>
                                  <p className="text-sm font-medium text-gray-700">
                                    {(lesson.title as Record<string, string>).en ?? "Untitled"}
                                  </p>
                                </div>
                                {attempts.length > 0 && (
                                  <div className="mt-2 space-y-1 pl-6">
                                    {attempts.map(a => (
                                      <div key={a.attemptNumber} className="flex items-center gap-2 text-xs">
                                        <span className={`rounded px-1.5 py-0.5 font-bold ${a.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                          {a.passed ? "PASS" : "FAIL"}
                                        </span>
                                        <span className="text-gray-600">Attempt #{a.attemptNumber}</span>
                                        <span className="text-gray-600">Score: {a.score}%</span>
                                        <span className="text-gray-400 uppercase">{a.languageUsed}</span>
                                        {a.languageUsed === "rw" && <span className="text-purple-500 text-[10px]">AI-translated</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Staff Notes (Private)</h2>
        <div className="space-y-2 mb-4">
          {farmer.farmerNotes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
          {farmer.farmerNotes.map(note => (
            <div key={note.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm text-gray-800">{note.body}</p>
              <p className="text-xs text-gray-400 mt-1">
                {note.author.name} · {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            className="input flex-1 h-20 resize-none text-sm"
            placeholder="Add a private note about this farmer…"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
          />
          <button onClick={addNote} disabled={addingNote || !noteText.trim()} className="btn-primary self-end disabled:opacity-50">
            {addingNote ? "Adding…" : "Add Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
