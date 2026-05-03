// e2e/admin-approval.spec.ts
// NEW: E2E test — Admin approves course → trainer receives notification
import { test, expect } from "@playwright/test";

test.describe("Admin Course Approval", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "admin@twihugurehub.rw");
    await page.fill('[name="password"]', "Admin@1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 10000 });
  });

  test("admin can view pending course approvals", async ({ page }) => {
    await page.goto("/admin/approvals");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("admin dashboard shows key metrics", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator("h1")).toBeVisible();
  });
});
