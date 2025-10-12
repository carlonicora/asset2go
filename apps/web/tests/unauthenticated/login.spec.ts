import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should show landing page when not logged in", async ({ page }) => {
    await expect(page).toHaveTitle(/.*Asset2Go.*/i);
  });

  test("should have login functionality visible", async ({ page }) => {
    await expect(page.locator('[data-testid="page-pre-login-container"]')).toBeVisible({ timeout: 10000 });
  });

  test("should have the login button", async ({ page }) => {
    await expect(page.locator('[data-testid="page-login-button-initial-login"]')).toBeVisible({ timeout: 10000 });
  });

  test("should show login form after clicking login button", async ({ page }) => {
    await page.locator('[data-testid="page-login-button-initial-login"]').click();
    await expect(page.locator('[data-testid="page-login-container"]')).toBeVisible({ timeout: 10000 });
  });

  test("should display login form elements", async ({ page }) => {
    await page.locator('[data-testid="page-login-button-initial-login"]').click();

    // Check form elements are present
    await expect(page.locator('[data-testid="form-login-input-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-login-input-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-login-button-submit"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-login-link-forgot-password"]')).toBeVisible();
  });

  test("should show validation errors for empty fields", async ({ page }) => {
    await page.locator('[data-testid="page-login-button-initial-login"]').click();

    // Try to submit empty form
    await page.locator('[data-testid="form-login-button-submit"]').click();

    // Should show validation errors
    await expect(page.locator("text=/invalid.*email/i")).toBeVisible({ timeout: 5000 });
  });

  test("should show validation error for invalid email format", async ({ page }) => {
    await page.locator('[data-testid="page-login-button-initial-login"]').click();

    // Enter invalid email
    await page.locator('[data-testid="form-login-input-email"]').fill("invalid-email");
    await page.locator('[data-testid="form-login-input-password"]').fill("somepassword");
    await page.locator('[data-testid="form-login-button-submit"]').click();

    // Should show email validation error
    await expect(page.locator("text=/invalid.*email/i")).toBeVisible({ timeout: 5000 });
  });

  test("should successfully login with correct credentials", async ({ page }) => {
    await page.locator('[data-testid="page-login-button-initial-login"]').click();

    // Fill in correct credentials
    await page.locator('[data-testid="form-login-input-email"]').fill("carlo@carlonicora.com");
    await page.locator('[data-testid="form-login-input-password"]').fill("password");

    // Submit form
    await page.locator('[data-testid="form-login-button-submit"]').click();

    // Should redirect to homepage (or wait for navigation)
    await page.waitForURL("/en", { timeout: 10000 });

    // Should be logged in - check for logged-in state elements
    // Adjust this selector based on what appears when logged in
    await expect(page.locator('[data-testid="page-homepage-container"]')).toBeVisible({ timeout: 10000 });
  });

  test("should show error for incorrect credentials", async ({ page }) => {
    await page.locator('[data-testid="page-login-button-initial-login"]').click();

    // Fill in incorrect credentials
    await page.locator('[data-testid="form-login-input-email"]').fill("carlo@carlonicora.com");
    await page.locator('[data-testid="form-login-input-password"]').fill("wrongpassword");

    // Submit form
    await page.locator('[data-testid="form-login-button-submit"]').click();

    // Should show error toast - look for toast container or error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    // Or check for unauthorized/error text in the toast
    await expect(page.locator('text="Unauthorized"')).toBeVisible({ timeout: 5000 });
  });
});
