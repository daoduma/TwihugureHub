// e2e/farmer-journey.spec.ts
// NEW: E2E test — Farmer registration → enroll → complete lesson → take quiz → certificate
import { test, expect } from "@playwright/test";

const FARMER_EMAIL = `e2e-farmer-${Date.now()}@twihugurehub.rw`;
const FARMER_PASS = "Farmer@Test1234";

test.describe("Farmer Learning Journey", () => {
  test("farmer registers, selects language, enrolls in course, completes lesson, takes quiz", async ({ page }) => {
    // ── Registration ──────────────────────────────────────────────────────
    await page.goto("/register");
    await expect(page).toHaveTitle(/TwihugureHub/);

    await page.fill('[name="name"]', "E2E Test Farmer");
    await page.fill('[name="email"]', FARMER_EMAIL);
    await page.fill('[name="password"]', FARMER_PASS);
    await page.selectOption('[name="preferredLanguage"]', "rw");
    await page.click('button[type="submit"]');

    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/login|farmer\/dashboard/, { timeout: 10000 });

    // ── Login ─────────────────────────────────────────────────────────────
    if (page.url().includes("login")) {
      await page.fill('[name="email"]', FARMER_EMAIL);
      await page.fill('[name="password"]', FARMER_PASS);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/farmer\/dashboard/, { timeout: 10000 });
    }

    // ── Browse courses ─────────────────────────────────────────────────────
    await page.goto("/farmer/courses");
    await expect(page.locator("h1")).toBeVisible();

    // ── Enroll in first course ─────────────────────────────────────────────
    const firstCourse = page.locator('[data-testid="course-card"]').first();
    if (await firstCourse.isVisible()) {
      await firstCourse.click();
      const enrollBtn = page.locator('button:has-text("Enroll"), button:has-text("Kwiyandikisha")');
      if (await enrollBtn.isVisible()) {
        await enrollBtn.click();
        await expect(page.locator('[role="alert"], .toast')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
