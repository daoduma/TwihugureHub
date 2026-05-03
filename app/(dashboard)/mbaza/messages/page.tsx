"use client";
// app/(dashboard)/mbaza/messages/page.tsx

import { useState, useEffect } from "react";

interface SentMessage {
  id: string;
  subject: string;
  body: string;
  language: string;
  sentAt: string;
  readAt: string | null;
  groupName: string | null;
  recipient: { name: string; email: string } | null;
}

interface Farmer { id: string; name: string; email: string; preferredLanguage: string; }
interface Group { id: string; name: string; }


export default function MessagesPage() {
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientType, setRecipientType] = useState<"farmer" | "group">("farmer");
  const [form, setForm] = useState({ recipientId: "", groupId: "", subject: "", body: "", language: "en" });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/mbaza/messages").then(r => r.json()),
      fetch("/api/mbaza/farmers?limit=200").then(r => r.json()),
      fetch("/api/mbaza/groups").then(r => r.json()),
    ]).then(([msgData, farmerData, groupData]) => {
      setSent(msgData.messages ?? []);
      setFarmers(farmerData.farmers ?? []);
      setGroups(groupData.groups ?? []);
      setLoading(false);
    });
  }, []);

  // Auto-set language from selected farmer
  const onRecipientChange = (id: string) => {
    setForm(p => ({ ...p, recipientId: id }));
    const farmer = farmers.find(f => f.id === id);
    if (farmer) setForm(p => ({ ...p, recipientId: id, language: farmer.preferredLanguage }));
  };

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    const body: Record<string, string> = { subject: form.subject, body: form.body, language: form.language };
    if (recipientType === "farmer") body.recipientId = form.recipientId;
    else body.groupId = form.groupId;

    const res = await fetch("/api/mbaza/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSending(false);

    if (res.ok) {
      setSendResult(data.sent ? `✓ Sent to ${data.sent} farmers` : "✓ Message sent!");
      setForm({ recipientId: "", groupId: "", subject: "", body: "", language: "en" });
      // Refresh sent list
      fetch("/api/mbaza/messages").then(r => r.json()).then(d => setSent(d.messages ?? []));
    } else {
      setSendResult(`❌ ${data.error ?? "Failed to send"}`);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>Messaging ✉️</h1>
        <p className="text-sm text-gray-500 mt-1">Send messages to individual farmers or entire groups</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Compose Form */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Compose Message</h2>

          {sendResult && (
            <div className={`rounded-lg p-2.5 text-sm font-medium ${sendResult.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {sendResult}
            </div>
          )}

          {/* Recipient type toggle */}
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(["farmer", "group"] as const).map(t => (
              <button key={t} onClick={() => setRecipientType(t)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${recipientType === t ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}>
                {t === "farmer" ? "👤 Individual" : "👥 Group"}
              </button>
            ))}
          </div>

          {recipientType === "farmer" ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Farmer</label>
              <select className="input w-full" value={form.recipientId} onChange={e => onRecipientChange(e.target.value)}>
                <option value="">Select farmer…</option>
                {farmers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.email})</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Group</label>
              <select className="input w-full" value={form.groupId} onChange={e => setForm(p => ({ ...p, groupId: e.target.value }))}>
                <option value="">Select group…</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
            <select className="input w-full" value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="rw">Ikinyarwanda</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <input className="input w-full" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Course reminder, progress update…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message Body</label>
            <textarea className="input w-full h-32 resize-none text-sm" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Dear farmer, we noticed…" />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !form.subject || !form.body || (recipientType === "farmer" ? !form.recipientId : !form.groupId)}
            className="btn-primary w-full disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send Message ✉️"}
          </button>
        </div>

        {/* Sent Messages */}
        <div className="lg:col-span-3 card p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Sent Messages ({sent.length})</h2>
          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          <div className="space-y-3 overflow-y-auto max-h-[600px]">
            {sent.length === 0 && !loading && <p className="text-sm text-gray-400 text-center py-8">No messages sent yet</p>}
            {sent.map(msg => (
              <div key={msg.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{msg.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      To: {msg.groupName ? `👥 ${msg.groupName}` : msg.recipient?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${msg.readAt ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {msg.readAt ? "Read" : "Delivered"}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase">{msg.language}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{new Date(msg.sentAt).toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
