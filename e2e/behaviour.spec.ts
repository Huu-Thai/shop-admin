import { expect, test } from '@playwright/test';

test('dark mode and accent presets apply and persist', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('radio', { name: 'Teal' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'teal');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'teal');
  // Back to the defaults for the other tests.
  await page.getByRole('radio', { name: 'System' }).click();
  await page.getByRole('radio', { name: 'Lime' }).click();
});

test('the interface switches to Vietnamese', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'sa_locale', value: 'vi', url: baseURL! }]);
  await page.goto('/orders');
  await expect(page.getByRole('heading', { level: 1, name: 'Đơn hàng' })).toBeVisible();
  await context.addCookies([{ name: 'sa_locale', value: 'en', url: baseURL! }]);
});

test('sheets close with Escape and give focus back', async ({ page }) => {
  await page.goto('/customers/groups');
  const open = page.getByRole('button', { name: 'New group' });
  await open.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(open).toBeFocused();
});

test('a skip link leads to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
});

test('demo mode shows its banner and refuses changes', async ({ page, request }) => {
  test.skip(
    process.env.E2E_DEMO !== '1',
    'set E2E_DEMO=1 against an admin running with DEMO_MODE=true',
  );
  await page.goto('/');
  await expect(page.getByRole('note')).toContainText('Demo');
  const res = await request.post('/api/gw/customer-groups', {
    headers: { 'x-shop-admin': '1', origin: new URL(page.url()).origin },
    data: { code: 'e2e', name: 'E2E' },
  });
  expect(res.status()).toBe(403);
});

test('the gateway refuses changes from another site or without its header', async ({
  request,
  baseURL,
}) => {
  // Signed in, so these reach the CSRF checks rather than the session check.
  const cross = await request.post('/api/gw/orders/x/notes', {
    headers: { origin: 'https://evil.example', 'x-shop-admin': '1' },
    data: {},
  });
  expect(cross.status()).toBe(403);
  const bare = await request.post('/api/gw/orders/x/notes', {
    headers: { origin: new URL(baseURL!).origin },
    data: {},
  });
  expect(bare.status()).toBe(403);
});
