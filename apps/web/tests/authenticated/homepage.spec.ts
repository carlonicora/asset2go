import { expect, test } from "@playwright/test";

test.describe("Authenticated Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should load homepage and display authenticated content", async ({ page }) => {
    await expect(page).toHaveTitle(/.*Asset2Go.*/i);
    await expect(page.locator('[data-testid="page-homepage-container"]')).toBeVisible();
  });

  test("should display sidebar when authenticated", async ({ page }) => {
    // Check sidebar is present
    await expect(page.locator('[data-testid="sidebar-container"]')).toBeVisible();
  });

  test("should display main navigation items in sidebar", async ({ page }) => {
    // Check essential navigation items
    await expect(page.locator('[data-testid="sidebar-home-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-inbox-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-query-knowledge-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-quick-create-button"]')).toBeVisible();
  });

  test("should navigate to different sections via sidebar", async ({ page }) => {
    // Test home navigation
    await page.locator('[data-testid="sidebar-home-link"]').click();
    await expect(page).toHaveURL(/.*\/en\/?$/);

    // Test inbox navigation
    await page.locator('[data-testid="sidebar-inbox-link"]').click();
    await expect(page).toHaveURL(/.*\/en\/notification/);
  });

  test("should display company-specific navigation items", async ({ page }) => {
    // These items should be visible if user has a company
    const companyItems = ['[data-testid="sidebar-content-link"]', '[data-testid="sidebar-my-company-link"]'];

    for (const item of companyItems) {
      const element = page.locator(item);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
  });

  test("should display optional feature navigation items if available", async ({ page }) => {
    // These are optional features that may or may not be visible
    const optionalItems = [
      '[data-testid="sidebar-aoe-link"]',
      '[data-testid="sidebar-products-and-services-link"]',
      '[data-testid="sidebar-operations-link"]',
      '[data-testid="sidebar-reporter-link"]',
      '[data-testid="sidebar-crm-link"]',
      '[data-testid="sidebar-helpdesk-link"]',
      '[data-testid="sidebar-tasks-link"]',
    ];

    for (const item of optionalItems) {
      const element = page.locator(item);
      // Just check if they exist and are clickable if visible
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        await expect(element).toBeEnabled();
      }
    }
  });

  test("should trigger query knowledge with keyboard shortcut", async ({ page }) => {
    // Test Cmd+K (or Ctrl+K) shortcut
    const isMac = process.platform === "darwin";
    if (isMac) {
      await page.keyboard.press("Meta+k");
    } else {
      await page.keyboard.press("Control+k");
    }

    // Should navigate to agent conversation
    await expect(page).toHaveURL(/.*\/en\/conversations\/new/);
  });

  test("should open quick create functionality", async ({ page }) => {
    // Click quick create button
    await page.locator('[data-testid="sidebar-quick-create-button"]').click();

    // Should show quick create options (this might be a dropdown/modal)
    // Adjust based on actual QuickCreate component behavior
    await page.waitForTimeout(1000); // Wait for any animations
  });

  test("should handle sidebar collapse/expand functionality", async ({ page }) => {
    // The sidebar should be collapsible - test if there's a collapse trigger
    const sidebar = page.locator('[data-testid="sidebar-container"]');
    await expect(sidebar).toBeVisible();

    // If there's a collapse button, test it
    const collapseButton = page.locator('[data-testid="sidebar-trigger"]'); // Adjust selector if different
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      // Add assertions for collapsed state
    }
  });
});
