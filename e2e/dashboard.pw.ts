import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const fixturePath = resolve("test/fixtures/minimal-okf");

test.describe("OKF Dashboard rendered UI", () => {
  test("loads the fixture and renders the desktop overview and concept detail", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.includes("desktop"), "Desktop layout coverage");
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Choose Folder" })).toBeEnabled();
    await expect(page.getByLabel("Or enter a server-readable bundle path")).toHaveValue("");
    await page.getByLabel("Or enter a server-readable bundle path").fill(fixturePath);
    await page.getByRole("button", { name: "Load Path" }).click();

    await expect(page.getByRole("heading", { name: "minimal-okf" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bundle Summary" })).toBeVisible();
    await expect(page.locator(".metric-label").filter({ hasText: "Markdown Files" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Knowledge Graph" })).toBeVisible();
    await expect(page.locator(".app-sidebar")).toBeVisible();
    await expect(page.locator(".overview-grid")).toHaveCSS("display", "grid");
    await expect.poll(() => columnCount(page, ".overview-grid")).toBeGreaterThan(1);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(horizontalOverflow).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath("dashboard-desktop.png"),
      fullPage: true,
    });

    await page.getByRole("link", { name: "Concepts" }).first().click();
    await expect(page.getByRole("heading", { name: /Concepts/u })).toBeVisible();
    await page.getByRole("link", { name: "Orders" }).first().click();
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rendered Markdown" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Metadata" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Outgoing Links" })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("concept-detail-desktop.png"),
      fullPage: true,
    });
  });

  test("keeps core dashboard views usable on mobile", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Mobile layout coverage");
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Choose Folder" })).toBeEnabled();
    await expect(page.getByLabel("Or enter a server-readable bundle path")).toHaveValue("");
    await page.getByLabel("Or enter a server-readable bundle path").fill(fixturePath);
    await page.getByRole("button", { name: "Load Path" }).click();

    await expect(page.getByRole("heading", { name: "minimal-okf" })).toBeVisible();
    await expect.poll(() => columnCount(page, ".overview-grid")).toBe(1);
    await page.getByRole("link", { name: "Concepts" }).first().click();
    await page.getByPlaceholder("Search concepts...").fill("revenue");
    await expect(page.getByRole("link", { name: "Revenue" })).toBeVisible();
    await page.getByRole("link", { name: "Validation" }).first().click();
    await expect(page.getByRole("heading", { name: /Findings/u })).toBeVisible();

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(horizontalOverflow).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath("dashboard-mobile.png"),
      fullPage: true,
    });
  });
});

async function columnCount(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    return getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length;
  });
}
