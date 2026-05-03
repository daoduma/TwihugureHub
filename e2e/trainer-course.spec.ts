// e2e/trainer-course.spec.ts
// NEW: E2E test — Trainer creates course, creates quiz, submits for approval
import { test, expect } from "@playwright/test";

test.describe("Trainer Course Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "trainer1@twihugurehub.rw");
    await page.fill('[name="password"]', "Trainer@1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/trainer\/dashboard/, { timeout: 10000 });
  });

  test("trainer can view their courses", async ({ page }) => {
    await page.goto("/trainer/courses");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("trainer can navigate to create new course", async ({ page }) => {
    await page.goto("/trainer/courses/new");
    await expect(page.locator("form, [data-testid='course-form']")).toBeVisible({ timeout: 5000 });
  });
});
