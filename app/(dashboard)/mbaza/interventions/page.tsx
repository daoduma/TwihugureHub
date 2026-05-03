"use client";
// app/(dashboard)/mbaza/interventions/page.tsx

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface FlagItem {
  id: string;
  flagType: string;
  isResolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
  farmer: { id: string; name: string; email: string; preferredLanguage: string };
  course: { id: string; title: Record<string, string> } | null;
  resolvedBy: { name: string } | null;
}

const FLAG_LABELS: Record<string, string> = {
  FLAG_INACTIVE: "Inactive 14d+",
  FLAG_FAILING: "Failing Quizzes",
  FLAG_STALLED: "Stalled Progress",
};
const FLAG_COLORS: Record<string, string> = {
  FLAG_INACTIVE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  FLAG_FAILING: "bg-red-100 text-red-700 border-red-200",
  FLAG_STALLED: "bg-orange-100 text-orange-700 border-orange-200",
};

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function ResolveModal({ flag, onClose, onResolved }: { flag: FlagItem; onClose: () => void; onResolved: () => void }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResolve = async () => {
    setLoading(true);
    await fetch(`/api/mbaza/interventions/${flag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setLoading(false);
    onResolved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Mark as Resolved</h2>
        <p className="text-sm text-gray-500 mb-4">
          Farmer: <strong>{flag.farmer.name}</strong> · Flag: {FLAG_LABELS[flag.flagType] ?? flag.flagType}
        </p>
        <textarea
          className="input w-full h-24 resize-none"
          placeholder="Resolution notes (optional)…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleResolve} disabled={loading} className="btn-primary flex-1">
            {loading ? "Resolving…" : "Mark Resolved"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageModal({ farmer, onClose }: { farmer: FlagItem["farmer"]; onClose: () => void }) {
  const [form, setForm] = useState({ subject: "", body: "", language: farmer.preferredLanguage });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    await fetch("/api/mbaza/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: farmer.id, ...form }),
    });
    setLoading(false);
    setSent(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Send Message</h2>
        <p className="text-sm text-gray-500 mb-4">To: <strong>{farmer.name}</strong> ({farmer.email})</p>
        {sent ? <p className="text-green-600 font-medium text-center py-4">✓ Message sent!</p> : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
              <input className="input w-full" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Regarding your course progress…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea className="input w-full h-24 resize-none" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Dear farmer…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
              <select className="input w-full" value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="rw">Ikinyarwanda</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSend} disabled={loading || !form.subject || !form.body} className="btn-primary flex-1">
                {loading ? "Sending…" : "Send Message"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// CHANGED: Added page title for browser <title> tags
export const metadata = { title: "Interventions" };

export default function InterventionsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<{ created: number; skipped: number } | null>(null);
  const [resolveFlag, setResolveFlag] = useState<FlagItem | null>(null);
  const [messageFlag, setMessageFlag] = useState<FlagItem | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/mbaza/interventions?resolved=${activeTab === "resolved"}`);
    const data = await res.json();
    setFlags(data.flags ?? []);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const runCheck = async () => {
    setRunningCheck(true);
    const res = await fetch("/api/mbaza/run-flag-check", { method: "POST" });
    const data = await res.json();
    setCheckResult(data);
    setRunningCheck(false);
    fetchFlags();
  };

  return (
    <div className="animate-fade-in space-y-5">
      {resolveFlag && <ResolveModal flag={resolveFlag} onClose={() => setResolveFlag(null)} onResolved={fetchFlags} />}
      {messageFlag && <MessageModal farmer={messageFlag.farmer} onClose={() => setMessageFlag(null)} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>Intervention Flags</h1>
          <p className="text-sm text-gray-500">Farmers who may need support</p>
        </div>
        <div className="flex items-center gap-2">
          {checkResult && (
            <span className="text-xs text-green-600 bg-green-50 rounded-lg px-2 py-1">
              ✓ {checkResult.created} new flags created
            </span>
          )}
          <button onClick={runCheck} disabled={runningCheck} className="btn-secondary whitespace-nowrap text-sm">
            {runningCheck ? "⏳ Running…" : "⚡ Run Flag Check"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["active", "resolved"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab === "active" ? `🚩 Active Flags` : `✅ Resolved`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Farmer", "Flag Type", "Related Course", "Days Since Flag", activeTab === "resolved" ? "Resolved By" : "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Loading…</td></tr>}
            {!loading && flags.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-gray-400">
                {activeTab === "active" ? "No active flags 🎉" : "No resolved flags"}
              </td></tr>
            )}
            {flags.map(flag => (
              <tr key={flag.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/mbaza/farmers/${flag.farmer.id}`} className="font-medium text-brand-700 hover:underline">{flag.farmer.name}</Link>
                  <p className="text-xs text-gray-400">{flag.farmer.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${FLAG_COLORS[flag.flagType] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {FLAG_LABELS[flag.flagType] ?? flag.flagType}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px] truncate">
                  {flag.course ? (flag.course.title as Record<string, string>).en ?? "Untitled" : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-sm">
                  {daysSince(flag.createdAt)}d
                </td>
                <td className="px-4 py-3">
                  {activeTab === "resolved" ? (
                    <div>
                      <p className="text-xs font-medium text-gray-600">{flag.resolvedBy?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{flag.resolvedAt ? new Date(flag.resolvedAt).toLocaleDateString() : ""}</p>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => setResolveFlag(flag)} className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">✓ Resolve</button>
                      <button onClick={() => setMessageFlag(flag)} className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">✉ Message</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
