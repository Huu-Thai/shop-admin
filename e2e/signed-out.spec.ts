import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'sa_locale', value: 'en', url: baseURL! }]);
});

test('protected pages send you to sign in, and back afterwards', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?next=%2Forders/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});

test('a wrong password shows an error without revealing which field was wrong', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('nobody@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('sign-in page and style guide are accessible', async ({ page }) => {
  for (const path of ['/login', '/style-guide']) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(
      violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${path} ${v.id}`),
    ).toEqual([]);
  }
});

test('security headers are set', async ({ request }) => {
  const res = await request.get('/login');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-powered-by']).toBeUndefined();
});

test('the gateway refuses calls without a session', async ({ request }) => {
  expect((await request.get('/api/gw/orders')).status()).toBe(401);
});
