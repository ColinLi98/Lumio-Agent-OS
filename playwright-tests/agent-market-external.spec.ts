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
  const url = new URL(page.url());
  url.searchParams.set('surface', 'app');
  url.searchParams.set('imeDemo', '1');
  await page.goto(url.toString());
  await dismissBlockingUI(page);
};

test('agent marketplace discovers external feed candidate', async ({ page }) => {
  await page.route('**/api/agent-market/discover', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        trace_id: 'mkt_mock_trace',
        candidates: [
          {
            agent: {
              id: 'ext:postman:recruitment',
              name: 'Postman Echo Recruitment Agent',
              source: 'external_market',
              capabilities: ['job_sourcing', 'resume_optimization', 'salary_benchmark'],
              compliance_tags: ['external_feed', 'reviewed'],
            },
            fit_score: 0.92,
            reliability_score: 0.88,
            freshness_score: 0.86,
            latency_score: 0.8,
            cost_score: 0.74,
            total_score: 0.86,
          },
        ],
        rejected: [],
      }),
    });
  });

  await preparePage(page);
  await page.goto('/?imeDemo=1');
  await dismissBlockingUI(page);
  await openAppMode(page);

  await page.getByRole('button', { name: 'Agent', exact: true }).click({ force: true });
  await expect(page.getByText('Quick Start')).toBeVisible();

  const recruitingExample = page.getByRole('button', { name: /Recruiting example|招聘示例/i }).first();
  await recruitingExample.click({ force: true });
  await page.getByRole('button', { name: /Discover Agents|Discover/i }).first().click({ force: true });

  await expect(page.getByText(/Candidate Agents \(1\)/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/trace: mkt_mock/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Run Recommended \(1\)/i })).toBeVisible();
});
