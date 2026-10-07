import { expect, test as setup } from '@playwright/test';

/** Signs in once and saves the session for the other projects. */
setup('sign in', async ({ page, baseURL }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password)
    throw new Error('Set E2E_EMAIL and E2E_PASSWORD (an admin with every permission)');
  // Run in English whatever the browser prefers (assertions read English labels).
  await page.context().addCookies([{ name: 'sa_locale', value: 'en', url: baseURL! }]);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});
