// lib/mbaza/flagEngine.ts
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * Evaluates all farmers and creates InterventionFlag records where conditions are met.
 * Safe to call multiple times — will not duplicate flags that already exist and are unresolved.
 */
export async function runFlagCheck(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all active farmers
  const farmers = await db.user.findMany({
    where: { role: "FARMER", isActive: true },
    select: {
      id: true,
      sessions: { orderBy: { expires: "desc" }, take: 1 },
      enrollments: {
        select: {
          id: true,
          courseId: true,
          enrolledAt: true,
          progressPercent: true,
          completedAt: true,
        },
      },
      quizAttempts: {
        select: {
          quizId: true,
          passed: true,
          startedAt: true,
        },
        orderBy: { startedAt: "asc" },
      },
    },
  });

  // Helper: check if unresolved flag of this type already exists for farmer (+optional course)
  async function flagExists(farmerId: string, flagType: string, courseId?: string) {
    const flag = await db.interventionFlag.findFirst({
      where: {
        farmerId,
        flagType: flagType as "FLAG_INACTIVE" | "FLAG_FAILING" | "FLAG_STALLED",
        courseId: courseId ?? null,
        isResolved: false,
      },
    });
    return !!flag;
  }

  async function createFlag(
    farmerId: string,
    flagType: "FLAG_INACTIVE" | "FLAG_FAILING" | "FLAG_STALLED",
    courseId?: string
  ) {
    if (await flagExists(farmerId, flagType, courseId)) {
      skipped++;
      return;
    }
    await db.interventionFlag.create({
      data: { farmerId, flagType, courseId: courseId ?? null },
    });
    created++;

    // Notify all MBAZA_STAFF about new flag
    const mbazaStaff = await db.user.findMany({
      where: { role: "MBAZA_STAFF", isActive: true },
      select: { id: true },
    });
    await Promise.all(
      mbazaStaff.map((s) =>
        createNotification(s.id, "INTERVENTION_FLAG", undefined, undefined, {
          type: "farmer",
          id: farmerId,
        })
      )
    );
  }

  for (const farmer of farmers) {
    // ── FLAG_INACTIVE: no login in 14+ days ──────────────────────────────────
    const lastSession = farmer.sessions[0];
    const lastActive = lastSession ? new Date(lastSession.expires) : null;
    if (!lastActive || lastActive < fourteenDaysAgo) {
      await createFlag(farmer.id, "FLAG_INACTIVE");
    }

    // ── Per-course checks ────────────────────────────────────────────────────
    for (const enrollment of farmer.enrollments) {
      if (enrollment.completedAt) continue; // skip completed courses

      // FLAG_STALLED: enrolled 30+ days with < 20% progress
      if (
        enrollment.enrolledAt < thirtyDaysAgo &&
        enrollment.progressPercent < 20
      ) {
        await createFlag(farmer.id, "FLAG_STALLED", enrollment.courseId);
      }

      // FLAG_FAILING: failed same quiz 3+ times without ever passing
      // Group attempts by quizId
      const attemptsByQuiz: Record<string, { passed: boolean }[]> = {};
      for (const attempt of farmer.quizAttempts) {
        if (!attemptsByQuiz[attempt.quizId]) attemptsByQuiz[attempt.quizId] = [];
        attemptsByQuiz[attempt.quizId].push({ passed: attempt.passed });
      }

      for (const [, attempts] of Object.entries(attemptsByQuiz)) {
        const everPassed = attempts.some((a) => a.passed);
        if (!everPassed && attempts.length >= 3) {
          await createFlag(farmer.id, "FLAG_FAILING", enrollment.courseId);
          break; // one failing flag per enrollment is enough
        }
      }
    }
  }

  return { created, skipped };
}
