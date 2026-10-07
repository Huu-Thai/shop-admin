import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { resolve, ROUTES } from './routes';

/**
 * Every screen: renders without the error page, has exactly one h1, never scrolls sideways, and
 * (on the desktop project) has no serious or critical accessibility violations.
 */
for (const route of ROUTES) {
  test(`${route.path}`, async ({ page, request }, info) => {
    const url = await resolve(route, request);
    test.skip(!url, 'no data to open');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(url!);
    expect(res?.status(), 'HTTP status').toBeLessThan(400);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1);
    expect(errors, 'uncaught page errors').toEqual([]);

    if (info.project.name === 'desktop-1440') {
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes[0]?.target.join(' ')}`);
      expect(serious, 'axe serious/critical violations').toEqual([]);
    }
  });
}
