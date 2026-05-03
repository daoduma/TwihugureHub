"use client";
// app/(dashboard)/farmer/messages/page.tsx

import { useState, useEffect } from "react";

interface Message {
  id: string;
  subject: string;
  body: string;
  language: string;
  sentAt: string;
  readAt: string | null;
  sender: { name: string; role: string };
}

const ROLE_LABELS: Record<string, string> = {
  MBAZA_STAFF: "Mbaza Staff",
  ADMIN: "Admin",
  TRAINER: "Trainer",
};


export default function FarmerMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);

  useEffect(() => {
    fetch("/api/farmer/messages")
      .then(r => r.json())
      .then(d => {
        setMessages(d.messages ?? []);
        setLoading(false);
      });
  }, []);

  const unread = messages.filter(m => !m.readAt).length;

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          My Messages ✉️
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading ? "Loading…" : `${messages.length} messages · ${unread} unread`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Message List */}
        <div className="lg:col-span-1 card overflow-hidden">
          {loading && <p className="p-6 text-sm text-gray-400 text-center">Loading…</p>}
          {!loading && messages.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-gray-400">No messages yet</p>
            </div>
          )}
          <div className="divide-y divide-gray-50">
            {messages.map(msg => (
              <button
                key={msg.id}
                onClick={() => setSelected(msg)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === msg.id ? "bg-brand-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {!msg.readAt && (
                        <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                      )}
                      <p className={`text-sm truncate ${!msg.readAt ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                        {msg.subject}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ROLE_LABELS[msg.sender.role] ?? msg.sender.role} · {msg.sender.name}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                    {new Date(msg.sentAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-xs text-gray-500 truncate mt-1">{msg.body}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 card p-6">
          {!selected ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400">
              <div className="text-center">
                <p className="text-3xl mb-2">📩</p>
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900">{selected.subject}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                  <span>From: <strong>{selected.sender.name}</strong> ({ROLE_LABELS[selected.sender.role] ?? selected.sender.role})</span>
                  <span>{new Date(selected.sentAt).toLocaleString()}</span>
                  <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs uppercase">{selected.language}</span>
                  {selected.readAt && (
                    <span className="rounded-full bg-green-100 text-green-600 px-2 py-0.5 text-xs">Read</span>
                  )}
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {selected.body}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
