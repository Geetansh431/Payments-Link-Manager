import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, openApp } from './helpers.ts';

test.describe('accessibility @a11y', () => {
  test('the page with links has no serious accessibility problems', async ({ page }) => {
    await openApp(page);
    await expectNoA11yViolations(page);
  });

  test('the form showing every error has no serious accessibility problems', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Create payment link' }).click();
    await expect(page.getByText('Enter an amount')).toBeVisible();

    await expectNoA11yViolations(page);
  });

  for (const filter of ['Active', 'Partially paid', 'Paid', 'Expired']) {
    test(`the ${filter} filter has no serious accessibility problems`, async ({ page }) => {
      await openApp(page);
      await page.getByRole('button', { name: new RegExp(`^${filter}`) }).click();

      await expectNoA11yViolations(page);
    });
  }

  test('the record payment form has no serious accessibility problems', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Record payment: Website design: 50% deposit' }).click();
    await page.getByLabel('Amount received (₹)').fill('1');
    await page.getByRole('button', { name: 'Save payment' }).click();
    await expect(page.getByText(/The first payment must be at least/)).toBeVisible();

    await expectNoA11yViolations(page);
  });

  test('the load error state has no serious accessibility problems', async ({ page }) => {
    await page.goto('/?mock=reset,fail-load');
    await expect(page.getByRole('alert')).toBeVisible();

    await expectNoA11yViolations(page);
  });

  test('the page never scrolls sideways', async ({ page }) => {
    await openApp(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the skip link moves focus to the main content', async ({ page }) => {
    await openApp(page);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('main')).toBeFocused();
  });
});
