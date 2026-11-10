import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Opens the app with fresh sample data and waits for the list to load.
 *
 * @param page - The Playwright page.
 * @param mockFlags - Extra `?mock=` switches, e.g. `['fail-create']`.
 */
export async function openApp(page: Page, mockFlags: string[] = []) {
  await page.goto(`/?mock=${['reset', ...mockFlags].join(',')}`);
  await expect(page.getByRole('list', { name: 'Payment links' })).toBeVisible();
}

/**
 * Fills in the create form. Fields left out stay empty.
 *
 * @param page - The Playwright page.
 * @param values - The values to type.
 */
export async function fillCreateForm(
  page: Page,
  values: {
    amount?: string;
    description?: string;
    email?: string;
    phone?: string;
    expiry?: string;
  },
) {
  if (values.amount) await page.getByLabel('Amount (₹)').fill(values.amount);
  if (values.description) await page.getByLabel('Description').fill(values.description);
  if (values.email) await page.getByLabel('Email').fill(values.email);
  if (values.phone) await page.getByLabel('Phone').fill(values.phone);
  if (values.expiry) await page.getByLabel('Expiry (optional)').fill(values.expiry);
}

/**
 * The cards in the links list.
 *
 * @param page - The Playwright page.
 */
export function linkCards(page: Page) {
  return page.getByRole('list', { name: 'Payment links' }).getByRole('listitem');
}

/**
 * Runs an axe accessibility scan (WCAG 2.1 A and AA) and fails on any serious or
 * critical problem.
 *
 * @param page - The Playwright page.
 */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}
