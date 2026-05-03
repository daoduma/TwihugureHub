"use client";
// app/(dashboard)/admin/audit-logs/page.tsx

import { useState, useEffect, useCallback } from "react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user: { name: string; email: string; role: string };
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  REGISTER: "bg-cyan-100 text-cyan-700",
  CREATE_USER: "bg-green-100 text-green-700",
  UPDATE_USER: "bg-yellow-100 text-yellow-700",
  DEACTIVATE_USER: "bg-red-100 text-red-700",
  ACTIVATE_USER: "bg-emerald-100 text-emerald-700",
  APPROVE_COURSE: "bg-teal-100 text-teal-700",
  REJECT_COURSE: "bg-orange-100 text-orange-700",
  UPDATE_LLM_CONFIG: "bg-purple-100 text-purple-700",
};


export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (action) params.set("action", action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/audit-logs?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, action, from, to]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/admin/audit-logs/export?${params}`, "_blank");
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
            Audit Log Viewer
          </h1>
          <p className="text-sm text-gray-500">{total} entries total</p>
        </div>
        <button onClick={handleExport} className="btn-secondary whitespace-nowrap">⬇ Export CSV</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Filter by action (e.g. LOGIN)…"
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
        />
        <div className="flex gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" className="input" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" className="input" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
          </div>
        </div>
        {(action || from || to) && (
          <button onClick={() => { setAction(""); setFrom(""); setTo(""); setPage(1); }} className="text-sm text-gray-400 hover:text-gray-600 self-end pb-1">
            Clear ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No audit logs found</td></tr>
            )}
            {logs.map(log => (
              <>
                <tr
                  key={log.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-sm">{log.user.name}</p>
                    <p className="text-xs text-gray-400">{log.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {log.entity}
                    {log.entityId && <span className="ml-1 text-xs text-gray-400">#{log.entityId.slice(-6)}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {expanded === log.id ? "▲ collapse" : "▼ expand"}
                  </td>
                </tr>
                {expanded === log.id && (
                  <tr key={`${log.id}-expanded`} className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-3">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                        {JSON.stringify(log.metadata ?? {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages} ({total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
