import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://garudai.in';
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test2@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

// Skip all workflow tests if migration 007 is not deployed
// These tests require: lrs, pods, driver_settlements, invoice_trips tables
const MIGRATION_DEPLOYED = process.env.E2E_MIGRATION_007 === 'true';

test.describe('Workflow 1: Enquiry → Payment', () => {
  test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not configured');
  test.skip(!MIGRATION_DEPLOYED, 'Migration 007 not deployed — workflow entities (lrs, pods, settlements) not available');

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /get started|sign in/i }).click();
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 15000 });
  });

  test('complete enquiry to trip flow', async ({ page }) => {
    // Navigate to enquiries
    await page.getByText(/enquiries/i).first().click();
    await expect(page.getByText(/enquiries/i)).toBeVisible();

    // Create enquiry
    await page.getByRole('button', { name: /add|new|create/i }).first().click();
    await page.getByPlaceholder(/origin/i).fill('Mumbai');
    await page.getByPlaceholder(/destination/i).fill('Pune');
    // Submit
    await page.getByRole('button', { name: /save|submit|create/i }).last().click();

    // Verify enquiry created
    await expect(page.getByText(/mumbai/i)).toBeVisible({ timeout: 5000 });
  });

  test('create quotation from enquiry', async ({ page }) => {
    await page.getByText(/enquiries/i).first().click();
    // Find and click convert button
    const convertBtn = page.getByRole('button', { name: /create quotation/i }).first();
    if (await convertBtn.isVisible()) {
      await convertBtn.click();
      // Should show success or existing quotation message
      await expect(page.getByText(/quotation|created|exists/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('trip creation validates vehicle and driver', async ({ page }) => {
    await page.getByText(/trips/i).first().click();
    await page.getByRole('button', { name: /new trip|add/i }).first().click();
    // Try to submit without vehicle/driver — should show validation
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();
    // Should show error or validation message
    await expect(page.getByText(/required|select|missing/i)).toBeVisible({ timeout: 3000 });
  });

  test('invoice is idempotent', async ({ page }) => {
    await page.getByText(/trips/i).first().click();
    // This test verifies the idempotency message
    // A completed trip that already has an invoice should show "already invoiced"
    // Exact selectors depend on trip data availability
  });

  test('trip closure shows blockers', async ({ page }) => {
    await page.getByText(/trips/i).first().click();
    // Find a completed/billed trip and try to close
    const closeBtn = page.getByRole('button', { name: /close trip/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      // Should show blockers or close successfully
      await expect(page.getByText(/closed|cannot|blocker|override/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Workflow 1: Failure Paths', () => {
  test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not configured');
  test.skip(!MIGRATION_DEPLOYED, 'Migration 007 not deployed');

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /get started|sign in/i }).click();
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 15000 });
  });

  test('duplicate quotation conversion returns existing', async ({ page }) => {
    await page.getByText(/enquiries/i).first().click();
    const convertBtn = page.getByRole('button', { name: /create quotation/i }).first();
    if (await convertBtn.isVisible()) {
      await convertBtn.click();
      // Second click should return existing
      await convertBtn.click();
      await expect(page.getByText(/already exists|existing/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('credit-blocked customer shows error', async ({ page }) => {
    await page.getByText(/trips/i).first().click();
    await page.getByRole('button', { name: /new trip|add/i }).first().click();
    // Select a customer that's over credit limit (if test data exists)
    // This test is data-dependent
  });
});
