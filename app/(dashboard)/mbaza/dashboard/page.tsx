// app/(dashboard)/mbaza/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";
import MbazaDashboardCharts from "./Charts";

export const metadata: Metadata = { title: "Mbaza Dashboard – TwihugureHub" };

export default async function MbazaDashboard() {
  const session = await getServerSession(authOptions);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalFarmers,
    allEnrollments,
    completedThisMonth,
    activeFlags,
    courseCompletionRaw,
    weeklyActivity,
  ] = await Promise.all([
    db.user.count({ where: { role: "FARMER", isActive: true } }),
    db.enrollment.findMany({
      select: { progressPercent: true, completedAt: true },
    }),
    db.enrollment.count({
      where: { completedAt: { gte: monthStart } },
    }),
    db.interventionFlag.count({ where: { isResolved: false } }),
    // Completion rates per course (top 8)
    db.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        enrollments: { select: { progressPercent: true, completedAt: true } },
      },
      take: 8,
    }),
    // Weekly quiz attempts (last 7 weeks)
    db.quizAttempt.findMany({
      where: {
        startedAt: { gte: new Date(now.getTime() - 49 * 24 * 60 * 60 * 1000) },
      },
      select: { startedAt: true },
      orderBy: { startedAt: "asc" },
    }),
  ]);

  const avgCompletion = allEnrollments.length
    ? Math.round(allEnrollments.reduce((s, e) => s + e.progressPercent, 0) / allEnrollments.length)
    : 0;

  // Build chart data: completion by course
  const courseChartData = courseCompletionRaw.map((c) => ({
    name: ((c.title as Record<string, string>).en ?? "Untitled").slice(0, 24),
    completionRate: c.enrollments.length
      ? Math.round(c.enrollments.reduce((s, e) => s + e.progressPercent, 0) / c.enrollments.length)
      : 0,
    enrolled: c.enrollments.length,
  }));

  // Build weekly line chart data
  const weekLabels: string[] = [];
  const weekCounts: number[] = Array(7).fill(0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weekLabels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
  }
  for (const attempt of weeklyActivity) {
    const msAgo = now.getTime() - new Date(attempt.startedAt).getTime();
    const weekIndex = 6 - Math.floor(msAgo / (7 * 24 * 60 * 60 * 1000));
    if (weekIndex >= 0 && weekIndex < 7) weekCounts[weekIndex]++;
  }
  const lineChartData = weekLabels.map((week, i) => ({ week, attempts: weekCounts[i] }));

  const kpis = [
    { label: "Total Farmers", value: totalFarmers, icon: "👨‍🌾", color: "bg-green-50 text-green-700", href: "/mbaza/farmers" },
    { label: "Avg Completion", value: `${avgCompletion}%`, icon: "📊", color: "bg-blue-50 text-blue-700", href: "/mbaza/reports" },
    { label: "Completed This Month", value: completedThisMonth, icon: "✅", color: "bg-teal-50 text-teal-700", href: "/mbaza/farmers" },
    { label: "Active Flags", value: activeFlags, icon: activeFlags > 0 ? "🚩" : "🏳️", color: activeFlags > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500", href: "/mbaza/interventions" },
  ];

  const quickLinks = [
    { href: "/mbaza/farmers", label: "Farmer Progress List", emoji: "👨‍🌾" },
    { href: "/mbaza/reports", label: "Generate Reports", emoji: "📋" },
    { href: "/mbaza/interventions", label: "Intervention Flags", emoji: "🚩" },
    { href: "/mbaza/groups", label: "Group Management", emoji: "👥" },
    { href: "/mbaza/messages", label: "Messaging", emoji: "✉️" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Mbaza Staff Dashboard 🌱
        </h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, {session?.user?.name}. Farmer progress overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="card p-5 hover:shadow-md transition-shadow">
            <span className="text-2xl">{kpi.icon}</span>
            <p className={`mt-2 text-3xl font-bold ${kpi.color.split(" ")[1]}`}>{kpi.value}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-700">{kpi.label}</p>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <MbazaDashboardCharts courseChartData={courseChartData} lineChartData={lineChartData} />

      {/* Quick Links */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-3 text-center hover:bg-brand-50 hover:border-brand-200 transition-colors">
              <span className="text-2xl">{link.emoji}</span>
              <span className="text-xs font-medium text-gray-700">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
