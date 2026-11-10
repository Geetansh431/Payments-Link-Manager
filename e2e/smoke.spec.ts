import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('app shell loads @a11y', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Payment Links' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? ''),
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test('no horizontal scroll at current viewport', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
