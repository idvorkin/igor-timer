/**
 * Bug Report Dialog E2E Tests
 *
 * Tests the bug report dialog functionality:
 * - Opening the dialog
 * - Metadata display
 * - Form inputs
 * - Submit/cancel actions
 */

import { expect, test } from '@playwright/test';

test.describe('Bug Report Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open bug report dialog from settings', async ({ page }) => {
    // Open settings
    await page.click('[aria-label="Settings"]');
    await expect(page.locator('text=SETTINGS')).toBeVisible();

    // Click Report a Bug button
    await page.click('button:has-text("Report a Bug")');

    // Dialog should appear
    await expect(page.locator('text=Report a Bug').first()).toBeVisible();
    await expect(page.locator('text=AUTO-INCLUDED DATA')).toBeVisible();
  });

  test('should show metadata in bug report dialog', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('button:has-text("Report a Bug")');

    // Should show device info labels
    await expect(page.locator('text=DEVICE')).toBeVisible();
    await expect(page.locator('text=SCREEN')).toBeVisible();
    await expect(page.locator('text=BROWSER')).toBeVisible();
    await expect(page.locator('text=BUILD')).toBeVisible();
    await expect(page.locator('text=BRANCH')).toBeVisible();
    await expect(page.locator('text=BUILT')).toBeVisible();
    await expect(page.locator('text=SESSION')).toBeVisible();
    await expect(page.locator('text=CLICKS')).toBeVisible();
  });

  test('should show form inputs', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('button:has-text("Report a Bug")');

    // Should have title input and description textarea
    await expect(page.locator('input[placeholder="Brief title..."]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="What went wrong? (optional)"]')).toBeVisible();
  });

  test('should show action buttons', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('button:has-text("Report a Bug")');

    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Report on GitHub")')).toBeVisible();
  });

  test('should close dialog when clicking Cancel', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('button:has-text("Report a Bug")');

    await expect(page.locator('text=AUTO-INCLUDED DATA')).toBeVisible();

    await page.click('button:has-text("Cancel")');

    await expect(page.locator('text=AUTO-INCLUDED DATA')).not.toBeVisible();
  });

  test('should close dialog when clicking overlay', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('button:has-text("Report a Bug")');

    await expect(page.locator('text=AUTO-INCLUDED DATA')).toBeVisible();

    // Click outside the dialog on the overlay
    await page.locator('[class*="overlay"]').first().click({ position: { x: 10, y: 10 }, force: true });

    await expect(page.locator('text=AUTO-INCLUDED DATA')).not.toBeVisible();
  });

  test('should allow typing in form fields', async ({ page }) => {
    await page.click('[aria-label="Settings"]');
    await page.click('button:has-text("Report a Bug")');

    const titleInput = page.locator('input[placeholder="Brief title..."]');
    const descInput = page.locator('textarea[placeholder="What went wrong? (optional)"]');

    await titleInput.fill('Test bug title');
    await descInput.fill('This is a test description');

    await expect(titleInput).toHaveValue('Test bug title');
    await expect(descInput).toHaveValue('This is a test description');
  });
});
