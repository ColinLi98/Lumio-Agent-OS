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

test('agent marketplace discovers external feed candidate', async ({ page }) => {
  await preparePage(page);
  await page.goto('/');
  await dismissBlockingUI(page);
  await openAppMode(page);

  await page.getByRole('button', { name: 'Agent', exact: true }).click({ force: true });
  await expect(page.getByText('Agent Marketplace')).toBeVisible();

  await page.getByRole('button', { name: '招聘示例' }).click();
  await page.getByRole('button', { name: 'Discover' }).click();

  await expect(page.getByText('Postman Echo Recruitment Agent')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('external_market')).toBeVisible();
});
