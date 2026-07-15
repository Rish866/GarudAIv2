import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://garudai.in';
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test2@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

test.describe('Authentication', () => {
  test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not configured');

  test('valid login shows dashboard', async ({ page }) => {
    await page.goto(BASE_URL);
    // Click through landing page to login
    await page.getByRole('button', { name: /get started|sign in/i }).click();
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should see dashboard
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 15000 });
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /get started|sign in/i }).click();
    await page.getByPlaceholder(/email/i).fill('invalid@test.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('logout clears session', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /get started|sign in/i }).click();
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 15000 });
    // Logout
    // Look for user menu or logout button
    await page.locator('[class*="avatar"], button:has-text("Logout")').first().click();
    await page.getByText(/logout/i).click();
    // Should see login page
    await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });
  });
});
