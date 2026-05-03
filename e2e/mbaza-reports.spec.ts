// e2e/mbaza-reports.spec.ts
// NEW: E2E test — Mbaza staff views farmer progress, generates PDF report
import { test, expect } from "@playwright/test";

test.describe("Mbaza Staff Farmer Monitoring", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "mbaza@twihugurehub.rw");
    await page.fill('[name="password"]', "Mbaza@1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/mbaza\/dashboard/, { timeout: 10000 });
  });

  test("mbaza staff can view farmers list", async ({ page }) => {
    await page.goto("/mbaza/farmers");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("mbaza staff can view intervention flags", async ({ page }) => {
    await page.goto("/mbaza/interventions");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("mbaza staff can access reports page", async ({ page }) => {
    await page.goto("/mbaza/reports");
    await expect(page.locator("h1")).toBeVisible();
  });
});
