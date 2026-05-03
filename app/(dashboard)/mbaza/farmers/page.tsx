"use client";
// app/(dashboard)/mbaza/farmers/page.tsx

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface FarmerRow {
  id: string;
  name: string;
  email: string;
  preferredLanguage: string;
  groups: string;
  enrollCount: number;
  completed: number;
  avgProgress: number;
  avgScore: number | null;
  lastActive: string | null;
  flagCount: number;
  flags: string[];
}

const FLAG_COLORS: Record<string, string> = {
  FLAG_INACTIVE: "bg-yellow-100 text-yellow-700",
  FLAG_FAILING: "bg-red-100 text-red-700",
  FLAG_STALLED: "bg-orange-100 text-orange-700",
};

const FLAG_LABELS: Record<string, string> = {
  FLAG_INACTIVE: "Inactive",
  FLAG_FAILING: "Failing",
  FLAG_STALLED: "Stalled",
};


// CHANGED: Added page title for browser <title> tags
export const metadata = { title: "Farmers" };

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [flagged, setFlagged] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (flagged) params.set("flagged", flagged);
    const res = await fetch(`/api/mbaza/farmers?${params}`);
    const data = await res.json();
    setFarmers(data.farmers ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, flagged]);

  useEffect(() => { fetchFarmers(); }, [fetchFarmers]);

  const totalPages = Math.ceil(total / limit);

  function ProgressBar({ value }: { value: number }) {
    const color = value >= 80 ? "bg-green-500" : value >= 40 ? "bg-amber-400" : "bg-red-400";
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 rounded-full bg-gray-100">
          <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
        </div>
        <span className="text-xs text-gray-600">{value}%</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
            Farmer Progress List
          </h1>
          <p className="text-sm text-gray-500">{total} farmers tracked</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input sm:w-40" value={flagged} onChange={e => { setFlagged(e.target.value); setPage(1); }}>
          <option value="">All Farmers</option>
          <option value="yes">Flagged Only</option>
          <option value="no">No Flags</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Name", "Groups", "Courses", "Avg Progress", "Avg Score", "Last Active", "Flags", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && farmers.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-gray-400">No farmers found</td></tr>
            )}
            {farmers.map(f => (
              <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[100px] truncate">{f.groups || "—"}</td>
                <td className="px-4 py-3 text-center text-gray-600">{f.enrollCount}</td>
                <td className="px-4 py-3"><ProgressBar value={f.avgProgress} /></td>
                <td className="px-4 py-3 text-gray-600 text-center">{f.avgScore !== null ? `${f.avgScore}%` : "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {f.lastActive ? new Date(f.lastActive).toLocaleDateString() : "Never"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {f.flags.map(flag => (
                      <span key={flag} className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${FLAG_COLORS[flag] ?? "bg-gray-100 text-gray-600"}`}>
                        {FLAG_LABELS[flag] ?? flag}
                      </span>
                    ))}
                    {f.flags.length === 0 && <span className="text-gray-300 text-xs">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/mbaza/farmers/${f.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
