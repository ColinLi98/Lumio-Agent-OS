import { test, expect, type Page, type Locator } from '@playwright/test';

const preparePage = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('lumi_onboarding_completed', 'true');
    localStorage.setItem('lumi_digital_soul_bootstrapped', 'true');
  });
};

const clickIfVisible = async (locator: Locator) => {
  if (await locator.isVisible().catch(() => false)) {
    await locator.click({ force: true });
  }
};

const dismissBlockingUI = async (page: Page) => {
  await clickIfVisible(page.getByTitle('Dismiss'));
  await clickIfVisible(page.getByRole('button', { name: '跳过，慢慢了解我' }));
  await clickIfVisible(page.getByRole('button', { name: 'Skip, learn about me later' }));
  await clickIfVisible(page.getByRole('button', { name: '暂不开启' }));
};

const openAppMode = async (page: Page) => {
  const byTitle = page.getByTitle('App Mode');
  if (await byTitle.isVisible().catch(() => false)) {
    await byTitle.click({ force: true });
    return;
  }
  await page.getByRole('button', { name: /^App$/ }).click({ force: true });
};

test('loads keyboard mode by default', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');
  await dismissBlockingUI(page);

  await expect(page.getByRole('heading', { name: 'Lumi.AI' })).toBeVisible();
  await expect(
    page.getByText('Long press', { exact: false })
  ).toBeVisible();
});

test('switches to app mode and shows command center', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');
  await dismissBlockingUI(page);

  await openAppMode(page);

  await expect(page.getByRole('heading', { name: /^Lumi$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /打开键盘|Open Keyboard/ })).toBeVisible();
});

test('app mode can return to keyboard mode', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');
  await dismissBlockingUI(page);

  await openAppMode(page);
  await page.getByRole('button', { name: /打开键盘|Open Keyboard/ }).click();

  await expect(
    page.getByText('Long press', { exact: false })
  ).toBeVisible();
});
