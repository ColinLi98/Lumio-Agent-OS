import { test, expect, type Page } from '@playwright/test';

const preparePage = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('lumi_onboarding_completed', 'true');
  });
};

test('loads keyboard mode by default', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Lumi.AI' })).toBeVisible();
  await expect(
    page.getByText('Long press', { exact: false })
  ).toBeVisible();
});

test('switches to app mode and shows command center', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await page.getByTitle('App Mode').click();

  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Keyboard' })).toBeVisible();
});

test('app mode can return to keyboard mode', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');

  await page.getByTitle('App Mode').click();
  await page.getByRole('button', { name: 'Open Keyboard' }).click();

  await expect(
    page.getByText('Long press', { exact: false })
  ).toBeVisible();
});
