// app/(dashboard)/admin/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard – TwihugureHub" };

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  const [
    totalUsers, farmers, trainers, admins, mbazaStaff,
    totalCourses, pendingApprovals, llmConfig, recentLogs,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "FARMER" } }),
    db.user.count({ where: { role: "TRAINER" } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "MBAZA_STAFF" } }),
    db.course.count(),
    db.course.count({ where: { status: "PENDING_APPROVAL" } }),
    db.lLMConfig.findFirst(),
    db.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const actionColors: Record<string, string> = {
    LOGIN: "bg-blue-100 text-blue-700",
    CREATE_USER: "bg-green-100 text-green-700",
    DEACTIVATE_USER: "bg-red-100 text-red-700",
    ACTIVATE_USER: "bg-emerald-100 text-emerald-700",
    APPROVE_COURSE: "bg-teal-100 text-teal-700",
    REJECT_COURSE: "bg-orange-100 text-orange-700",
    UPDATE_LLM_CONFIG: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Admin Dashboard 🛡️
        </h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, {session?.user?.name}.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/admin/users" className="card p-5 hover:shadow-md transition-shadow">
          <span className="text-2xl">👥</span>
          <p className="mt-2 text-3xl font-bold text-brand-700">{totalUsers}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-700">Total Users</p>
          <p className="text-xs text-gray-400">{farmers}F · {trainers}T · {admins}A · {mbazaStaff}M</p>
        </Link>
        <Link href="/admin/approvals" className="card p-5 hover:shadow-md transition-shadow">
          <span className="text-2xl">📚</span>
          <p className="mt-2 text-3xl font-bold text-brand-700">{totalCourses}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-700">Total Courses</p>
          <p className="text-xs text-gray-400">All statuses</p>
        </Link>
        <Link href="/admin/approvals" className="card p-5 hover:shadow-md transition-shadow">
          <span className="text-2xl">{pendingApprovals > 0 ? "⚠️" : "✅"}</span>
          <p className={`mt-2 text-3xl font-bold ${pendingApprovals > 0 ? "text-amber-600" : "text-brand-700"}`}>
            {pendingApprovals}
          </p>
          <p className="mt-0.5 text-xs font-medium text-gray-700">Pending Approvals</p>
          <p className="text-xs text-gray-400">Awaiting review</p>
        </Link>
        <Link href="/admin/ai-settings" className="card p-5 hover:shadow-md transition-shadow">
          <span className="text-2xl">🤖</span>
          <p className={`mt-2 text-sm font-bold truncate ${llmConfig?.isActive ? "text-purple-700" : "text-red-500"}`}>
            {llmConfig?.isActive ? llmConfig.provider : "Not configured"}
          </p>
          <p className="mt-0.5 text-xs font-medium text-gray-700">AI / LLM Status</p>
          <p className="text-xs text-gray-400 truncate">{llmConfig?.modelId ?? "No model set"}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Audit Logs */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Audit Activity</h2>
            <Link href="/admin/audit-logs" className="text-xs text-brand-600 hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentLogs.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No audit logs yet</p>
            )}
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${actionColors[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                  {log.action.replace(/_/g, " ")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 truncate">
                    <span className="font-medium">{log.user.name}</span>
                    {" · "}
                    <span className="text-gray-500">{log.entity}</span>
                  </p>
                  <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Admin Sections</h2>
          <div className="space-y-1">
            {[
              { href: "/admin/users", label: "User Management", emoji: "👥" },
              { href: "/admin/approvals", label: "Content Approvals", emoji: "📋" },
              { href: "/admin/ai-settings", label: "AI / LLM Settings", emoji: "🤖" },
              { href: "/admin/audit-logs", label: "Audit Logs", emoji: "📜" },
              { href: "/admin/security", label: "Security Settings", emoji: "🔒" },
            ].map((link) => (
              <Link key={link.href} href={link.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <span className="text-lg">{link.emoji}</span>
                {link.label}
                <span className="ml-auto text-gray-300">→</span>
              </Link>
            ))}
          </div>
          {pendingApprovals > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-700">⚠️ Action required</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {pendingApprovals} course{pendingApprovals > 1 ? "s" : ""} awaiting approval.
              </p>
              <Link href="/admin/approvals" className="text-xs font-medium text-amber-700 underline">Review now →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
