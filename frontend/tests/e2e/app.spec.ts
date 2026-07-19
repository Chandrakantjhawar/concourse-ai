import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Concourse AI Frontend', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the stadiums API to allow the app to render the tabs
    await page.route('**/api/stadiums', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'metlife', name: 'MetLife Stadium', city: 'NY/NJ' }
        ])
      });
    });

    // Mock the health API
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', gemini_reachable: true })
      });
    });
  });

  test('should render the app shell and correct title', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Concourse AI/);
    
    // Expect the header to be visible and contain specific keywords for Problem Statement Alignment
    const logoSub = page.locator('.app-logo-sub');
    await expect(logoSub).toBeVisible();
    await expect(logoSub).toContainText('Venue & Operations Management');
    
    // Wait for the app to finish loading
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Ensure all 4 main tabs are visible
    await expect(page.getByRole('tab', { name: 'Fan Concierge' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Ops Center' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Volunteer' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Transit' })).toBeVisible();
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for loading to finish (the loading dots to disappear)
    await page.waitForSelector('.loading-dots', { state: 'hidden', timeout: 5000 }).catch(() => {});

    // Run AxeBuilder for accessibility violations
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    // We expect 0 violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should switch tabs properly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for the app to finish loading
    await page.waitForSelector('.app-header', { state: 'visible' });

    // Click on Ops Center tab
    await page.getByRole('tab', { name: 'Ops Center' }).click();
    
    // Verify Ops Center content is visible
    await expect(page.getByRole('heading', { name: 'Operations Command Center' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Simulate a Spike/ })).toBeVisible();
  });
});
