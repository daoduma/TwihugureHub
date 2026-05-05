// lib/mbaza/reportBuilder.ts
import { db } from "@/lib/db";

export type ReportType = "completion" | "performance" | "engagement" | "intervention";

export interface ReportFilters {
  type: ReportType;
  from?: string;
  to?: string;
  groupId?: string;
  courseId?: string;
  language?: string;
}

export interface ReportRow {
  [key: string]: string | number | boolean | null;
}

export interface ReportData {
  title: string;
  filters: ReportFilters;
  generatedAt: string;
  summary: Record<string, number | string>;
  columns: string[];
  rows: ReportRow[];
}

export async function buildReportData(filters: ReportFilters): Promise<ReportData> {
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;

  // If a group is specified, get farmer IDs for that group
  let groupFarmerIds: string[] | undefined;
  if (filters.groupId) {
    const memberships = await db.farmerGroupMembership.findMany({
      where: { groupId: filters.groupId },
      select: { farmerId: true },
    });
    groupFarmerIds = memberships.map((m) => m.farmerId);
  }

  const farmerWhere = groupFarmerIds ? { id: { in: groupFarmerIds } } : {};

  if (filters.type === "completion") {
    const enrollments = await db.enrollment.findMany({
      where: {
        farmer: farmerWhere,
        ...(filters.courseId ? { courseId: filters.courseId } : {}),
        ...(from || to
          ? { enrolledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: {
        farmer: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    });

    const rows: ReportRow[] = enrollments.map((e) => ({
      farmer: e.farmer.name,
      email: e.farmer.email,
      course: (e.course.title as Record<string, string>).en ?? "Untitled",
      enrolledAt: e.enrolledAt.toISOString().slice(0, 10),
      progressPercent: e.progressPercent,
      completed: e.completedAt ? "Yes" : "No",
      completedAt: e.completedAt ? e.completedAt.toISOString().slice(0, 10) : null,
    }));

    const totalEnrollments = rows.length;
    const completed = rows.filter((r) => r.completed === "Yes").length;
    const avgProgress = rows.length
      ? Math.round(rows.reduce((s, r) => s + (r.progressPercent as number), 0) / rows.length)
      : 0;

    return {
      title: "Course Completion Report",
      filters,
      generatedAt: new Date().toISOString(),
      summary: {
        totalEnrollments,
        completed,
        completionRate: totalEnrollments ? `${Math.round((completed / totalEnrollments) * 100)}%` : "0%",
        avgProgress: `${avgProgress}%`,
      },
      columns: ["farmer", "email", "course", "enrolledAt", "progressPercent", "completed", "completedAt"],
      rows,
    };
  }

  if (filters.type === "performance") {
    const attempts = await db.quizAttempt.findMany({
      where: {
        farmer: farmerWhere,
        ...(filters.language ? { languageUsed: filters.language } : {}),
        ...(from || to
          ? { startedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
        ...(filters.courseId
          ? { quiz: { lesson: { module: { courseId: filters.courseId } } } }
          : {}),
      },
      include: {
        farmer: { select: { name: true, email: true } },
        quiz: {
          include: {
            lesson: {
              include: { module: { include: { course: { select: { title: true } } } } },
            },
          },
        },
      },
    });

    const rows: ReportRow[] = attempts.map((a) => ({
      farmer: a.farmer.name,
      email: a.farmer.email,
      course:
        (a.quiz.lesson?.module?.course?.title as Record<string, string> | undefined)?.en ?? "N/A",
      attemptNumber: a.attemptNumber,
      score: a.score,
      passed: a.passed ? "Yes" : "No",
      languageUsed: a.languageUsed,
      date: a.startedAt.toISOString().slice(0, 10),
    }));

    const totalAttempts = rows.length;
    const passed = rows.filter((r) => r.passed === "Yes").length;
    const avgScore = rows.length
      ? Math.round(rows.reduce((s, r) => s + (r.score as number), 0) / rows.length)
      : 0;

    return {
      title: "Quiz Performance Report",
      filters,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAttempts,
        passed,
        passRate: totalAttempts ? `${Math.round((passed / totalAttempts) * 100)}%` : "0%",
        avgScore: `${avgScore}%`,
      },
      columns: ["farmer", "email", "course", "attemptNumber", "score", "passed", "languageUsed", "date"],
      rows,
    };
  }

  if (filters.type === "engagement") {
    const lessons = await db.lessonProgress.findMany({
      where: {
        farmer: farmerWhere,
        completedAt: {
          not: null,
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
      include: {
        farmer: { select: { name: true, email: true } },
        lesson: {
          include: {
            module: { include: { course: { select: { title: true } } } },
          },
        },
      },
    });

    const rows: ReportRow[] = lessons.map((lp) => ({
      farmer: lp.farmer.name,
      email: lp.farmer.email,
      course: (lp.lesson.module?.course?.title as Record<string, string> | undefined)?.en ?? "N/A",
      lesson: (lp.lesson.title as Record<string, string>).en ?? "Untitled",
      completedAt: lp.completedAt ? lp.completedAt.toISOString().slice(0, 10) : null,
      timeSpentMinutes: Math.round(lp.timeSpentSeconds / 60),
    }));

    const uniqueFarmers = new Set(rows.map((r) => r.email)).size;

    return {
      title: "Engagement Report",
      filters,
      generatedAt: new Date().toISOString(),
      summary: {
        totalLessonsCompleted: rows.length,
        uniqueFarmers,
        avgTimePerLessonMinutes: rows.length
          ? Math.round(rows.reduce((s, r) => s + (r.timeSpentMinutes as number), 0) / rows.length)
          : 0,
      },
      columns: ["farmer", "email", "course", "lesson", "completedAt", "timeSpentMinutes"],
      rows,
    };
  }

  if (filters.type === "intervention") {
    const flags = await db.interventionFlag.findMany({
      where: {
        farmer: farmerWhere,
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: {
        farmer: { select: { name: true, email: true } },
        course: { select: { title: true } },
        resolvedBy: { select: { name: true } },
      },
    });

    const rows: ReportRow[] = flags.map((f) => ({
      farmer: f.farmer.name,
      email: f.farmer.email,
      flagType: f.flagType,
      course: f.course ? (f.course.title as Record<string, string>).en ?? "N/A" : "N/A",
      createdAt: f.createdAt.toISOString().slice(0, 10),
      isResolved: f.isResolved ? "Yes" : "No",
      resolvedAt: f.resolvedAt ? f.resolvedAt.toISOString().slice(0, 10) : null,
      resolvedBy: f.resolvedBy?.name ?? null,
    }));

    const resolved = rows.filter((r) => r.isResolved === "Yes").length;

    return {
      title: "Intervention Report",
      filters,
      generatedAt: new Date().toISOString(),
      summary: {
        totalFlags: rows.length,
        resolved,
        active: rows.length - resolved,
        resolutionRate: rows.length ? `${Math.round((resolved / rows.length) * 100)}%` : "0%",
      },
      columns: ["farmer", "email", "flagType", "course", "createdAt", "isResolved", "resolvedAt", "resolvedBy"],
      rows,
    };
  }

  return {
    title: "Report",
    filters,
    generatedAt: new Date().toISOString(),
    summary: {},
    columns: [],
    rows: [],
  };
}
