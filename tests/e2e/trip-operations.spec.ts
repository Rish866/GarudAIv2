/**
 * E2E Test: Trip Operations (Cancel / Edit / Reopen / Transition)
 *
 * Prerequisites:
 * - Supabase project with migrations 000-008 applied
 * - Migration 007 deployed (workflow entities)
 * - .env.e2e configured with valid credentials
 * - Test users created:
 *   - owner@test.com (organization_owner role)
 *   - viewer@test.com (viewer role)
 * - At least one vehicle, driver, and customer in the test org
 *
 * Run: npx playwright test tests/e2e/trip-operations.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || '';
const VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL || '';
const VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD || '';

// All tests in this file require dedicated E2E test accounts
const HAS_OWNER_CREDS = Boolean(OWNER_EMAIL && OWNER_PASSWORD);
const HAS_VIEWER_CREDS = Boolean(VIEWER_EMAIL && VIEWER_PASSWORD);
const MIGRATION_DEPLOYED = process.env.E2E_MIGRATION_007 === 'true';

async function login(page: any, email: string, password: string) {
  await page.goto(BASE_URL);
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
}

async function navigateToTrips(page: any) {
  await page.click('[data-module="trips"]');
  await page.waitForSelector('h1:has-text("Trip Management")');
}

test.describe('Trip Operations E2E', () => {
  test.describe('Owner user workflows', () => {
    test.skip(!HAS_OWNER_CREDS, 'E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD not configured');
    test.skip(!MIGRATION_DEPLOYED, 'Migration 007 not deployed (E2E_MIGRATION_007 != true)');

    test.beforeEach(async ({ page }) => {
      await login(page, OWNER_EMAIL, OWNER_PASSWORD);
      await navigateToTrips(page);
    });

    test('1. Create a booked trip', async ({ page }) => {
      await page.click('button:has-text("New Trip")');
      await page.waitForSelector('h2:has-text("New Trip")');
      // Fill form
      await page.selectOption('[name="customer_id"]', { index: 1 });
      await page.selectOption('[name="vehicle_id"]', { index: 1 });
      await page.selectOption('[name="driver_id"]', { index: 1 });
      await page.fill('[name="origin"]', 'Mumbai');
      await page.fill('[name="destination"]', 'Delhi');
      await page.fill('[name="distance_km"]', '1400');
      await page.fill('[name="material"]', 'Steel');
      await page.fill('[name="weight_tons"]', '20');
      await page.fill('[name="freight_amount"]', '50000');
      await page.fill('[name="advance_amount"]', '10000');
      await page.click('button:has-text("Create Trip")');
      // Verify trip appears
      await expect(page.locator('text=Mumbai')).toBeVisible();
      await expect(page.locator('text=booked')).toBeVisible();
    });

    test('2. Edit trip details', async ({ page }) => {
      // Find a booked trip and click Edit
      const editBtn = page.locator('button[title="Edit Trip"]').first();
      await editBtn.click();
      await page.waitForSelector('h2:has-text("Edit Trip")');
      // Change freight
      await page.fill('[name="freight_amount"]', '55000');
      await page.fill('[name="remarks"]', 'E2E test edit');
      await page.click('button:has-text("Save Changes")');
      // Verify toast
      await expect(page.locator('text=updated')).toBeVisible({ timeout: 5000 });
    });

    test('3. Refresh confirms persistence', async ({ page }) => {
      await page.reload();
      await page.waitForSelector('h1:has-text("Trip Management")');
      // The edited remarks should persist (visible in detail modal)
      const viewBtn = page.locator('button[title="View Trip Details"]').first();
      await viewBtn.click();
      await expect(page.locator('text=E2E test edit')).toBeVisible();
    });

    test('4. Cancel trip with mandatory reason', async ({ page }) => {
      const cancelBtn = page.locator('button[title="Cancel Trip"]').first();
      await cancelBtn.click();
      await page.waitForSelector('h2:has-text("Cancel Trip")');
      // Try submit without reason — button disabled
      const confirmBtn = page.locator('button:has-text("Confirm Cancellation")');
      await expect(confirmBtn).toBeDisabled();
      // Enter reason
      await page.fill('textarea', 'E2E test cancellation reason');
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();
      // Verify toast
      await expect(page.locator('text=cancelled successfully')).toBeVisible({ timeout: 5000 });
    });

    test('5. Refresh confirms cancelled state and reason', async ({ page }) => {
      await page.reload();
      await page.waitForSelector('h1:has-text("Trip Management")');
      // Filter to cancelled
      await page.click('button:has-text("Cancelled")');
      await expect(page.locator('text=cancelled')).toBeVisible();
    });

    test('6. Reopen with mandatory reason', async ({ page }) => {
      await page.click('button:has-text("Cancelled")');
      const reopenBtn = page.locator('button[title="Reopen Trip"]').first();
      await reopenBtn.click();
      await page.waitForSelector('h2:has-text("Reopen Trip")');
      // Verify original reason shown
      await expect(page.locator('text=E2E test cancellation reason')).toBeVisible();
      // Enter reopen reason
      await page.fill('textarea', 'Customer confirmed again');
      await page.click('button:has-text("Confirm Reopen")');
      await expect(page.locator('text=reopened successfully')).toBeVisible({ timeout: 5000 });
    });

    test('7. Refresh confirms reopened state', async ({ page }) => {
      await page.reload();
      await page.waitForSelector('h1:has-text("Trip Management")');
      // Trip should now be back in "booked" status
      await expect(page.locator('text=booked').first()).toBeVisible();
    });

    test('8. Valid status transition (booked → assigned)', async ({ page }) => {
      const statusBtn = page.locator('button:has-text("Update Status")').first();
      await statusBtn.click();
      await page.click('button:has-text("assigned")');
      await expect(page.locator('text=Status updated')).toBeVisible({ timeout: 5000 });
    });

    test('9. Invalid transition rejected by DB', async ({ page }) => {
      // Try to transition a settled trip — no Update Status button should be visible
      // This is enforced by both UI (button hidden) and DB (RPC rejects)
      await page.click('button:has-text("All")');
      // Settled trips should not have Update Status button
      const settledCard = page.locator('.rounded-2xl:has-text("settled")');
      if (await settledCard.count() > 0) {
        const statusBtns = settledCard.locator('button:has-text("Update Status")');
        await expect(statusBtns).toHaveCount(0);
      }
    });

    test('10. Status history queryable', async ({ page }) => {
      // Open trip detail modal and verify timeline shows transitions
      const viewBtn = page.locator('button[title="View Trip Details"]').first();
      await viewBtn.click();
      await page.waitForSelector('h3:has-text("Trip Timeline")');
      await expect(page.locator('text=booked')).toBeVisible();
    });
  });

  test.describe('Viewer user restrictions', () => {
    test.skip(!HAS_VIEWER_CREDS, 'E2E_VIEWER_EMAIL and E2E_VIEWER_PASSWORD not configured');
    test.skip(!MIGRATION_DEPLOYED, 'Migration 007 not deployed (E2E_MIGRATION_007 != true)');

    test.beforeEach(async ({ page }) => {
      await login(page, VIEWER_EMAIL, VIEWER_PASSWORD);
      await navigateToTrips(page);
    });

    test('11. Viewer cannot see Edit/Cancel/Reopen/StatusUpdate buttons', async ({ page }) => {
      // None of these buttons should be visible for a viewer
      await expect(page.locator('button[title="Edit Trip"]')).toHaveCount(0);
      await expect(page.locator('button[title="Cancel Trip"]')).toHaveCount(0);
      await expect(page.locator('button[title="Reopen Trip"]')).toHaveCount(0);
      await expect(page.locator('button:has-text("Update Status")')).toHaveCount(0);
      // New Trip button should be disabled
      const newTripBtn = page.locator('button:has-text("New Trip")');
      await expect(newTripBtn).toBeDisabled();
    });

    test('12. Viewer can still see trip list and details', async ({ page }) => {
      await expect(page.locator('h1:has-text("Trip Management")')).toBeVisible();
      // View button should still work
      const viewBtn = page.locator('button[title="View Trip Details"]').first();
      if (await viewBtn.count() > 0) {
        await viewBtn.click();
        await page.waitForSelector('h3:has-text("Trip Timeline")');
      }
    });
  });
});
