import { expect, test } from '@playwright/test';
import { fillCreateForm, linkCards, openApp } from './helpers.ts';

test('create a link, then filter the list by status (happy path)', async ({ page }) => {
  await openApp(page);
  await expect(linkCards(page)).toHaveCount(4);

  // Create a link.
  await fillCreateForm(page, {
    amount: '1,499.50',
    description: 'Logo design for Café Mocha',
    email: 'owner@cafemocha.in',
  });
  await page.getByRole('button', { name: 'Create payment link' }).click();

  await expect(page.getByText('Payment link created')).toBeVisible();
  await expect(linkCards(page)).toHaveCount(5);
  const newCard = linkCards(page).first();
  await expect(newCard).toContainText('Logo design for Café Mocha');
  await expect(newCard).toContainText('₹1,499.50');
  await expect(newCard).toContainText('owner@cafemocha.in');
  await expect(newCard).toContainText('Active');

  // Filter: Active shows the new link alongside the other active ones.
  await page.getByRole('button', { name: /^Active \(3\)/ }).click();
  await expect(page.getByRole('button', { name: /^Active/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(linkCards(page)).toHaveCount(3);
  await expect(linkCards(page).first()).toContainText('Logo design for Café Mocha');
  await expect(page).toHaveURL(/status=Active/);

  // Filter: Paid hides it.
  await page.getByRole('button', { name: /^Paid \(1\)/ }).click();
  await expect(linkCards(page)).toHaveCount(1);
  await expect(linkCards(page)).not.toContainText(['Logo design for Café Mocha']);

  // Filter: All brings everything back.
  await page.getByRole('button', { name: /^All \(5\)/ }).click();
  await expect(linkCards(page)).toHaveCount(5);
});

test('validation errors can be found and fixed with the keyboard alone', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Create payment link' }).focus();
  await page.keyboard.press('Enter');

  const amount = page.getByLabel('Amount (₹)');
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter an amount')).toBeVisible();
  await expect(page.getByText('Enter a description')).toBeVisible();
  await expect(page.getByText('Enter a customer email or phone number')).toBeVisible();

  await page.keyboard.type('500001');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Annual maintenance');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.type('98765');
  await page.keyboard.press('Enter');

  await expect(amount).toBeFocused();
  await expect(page.getByText("Amount can't be more than ₹5,00,000")).toBeVisible();
  await expect(page.getByText('Enter a valid 10-digit Indian mobile number')).toBeVisible();

  await amount.fill('5000');
  await page.getByLabel('Phone').fill('+91 98765 43210');
  await page.getByLabel('Phone').press('Enter');

  await expect(page.getByText('Payment link created')).toBeVisible();
  await expect(linkCards(page).first()).toContainText('+91 98765 43210');
});

test('a failed save keeps the typed values and explains what happened', async ({ page }) => {
  await openApp(page, ['fail-create']);
  await fillCreateForm(page, {
    amount: '250',
    description: 'Workshop seat',
    email: 'sam@example.com',
  });

  await page.getByRole('button', { name: 'Create payment link' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    "We couldn't create the payment link. Please try again.",
  );
  await expect(page.getByLabel('Amount (₹)')).toHaveValue('250');
  await expect(page.getByLabel('Email')).toHaveValue('sam@example.com');
  await expect(linkCards(page)).toHaveCount(4);
});

test('a load failure shows an error with a retry button', async ({ page }) => {
  await page.goto('/?mock=reset,fail-load');

  await expect(page.getByRole('alert')).toContainText("We couldn't load your payment links.");
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('marking a link as paid moves it to the Paid filter', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Mark as paid: Bulk order: 40 notebooks' }).click();

  await expect(page.getByText('Marked “Bulk order: 40 notebooks” as paid.')).toBeVisible();
  await page.getByRole('button', { name: /^Paid \(2\)/ }).click();
  await expect(linkCards(page).filter({ hasText: 'Bulk order: 40 notebooks' })).toContainText(
    'Paid',
  );
});

test.describe('expiry', () => {
  test.use({ timezoneId: 'Asia/Kolkata' });

  test('a link turns Expired on screen once its expiry passes, without a refresh', async ({
    page,
  }) => {
    // 10 Nov 2026, 12:00 IST
    await page.clock.install({ time: new Date('2026-11-10T06:30:00.000Z') });
    await openApp(page);

    await fillCreateForm(page, {
      amount: '999',
      description: 'Flash sale hold',
      email: 'buyer@example.com',
      expiry: '2026-11-10T12:02',
    });
    await page.getByRole('button', { name: 'Create payment link' }).click();
    const card = linkCards(page).filter({ hasText: 'Flash sale hold' });
    await expect(card).toContainText('Active');

    await page.clock.fastForward('03:00');

    await expect(card).toContainText('Expired');
    await expect(card.getByRole('button', { name: /Mark as paid/ })).toHaveCount(0);
  });

  test('an expiry in the past is rejected', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-10T06:30:00.000Z') });
    await openApp(page);

    await fillCreateForm(page, {
      amount: '999',
      description: 'Old offer',
      email: 'buyer@example.com',
      expiry: '2026-11-10T11:00',
    });
    await page.getByRole('button', { name: 'Create payment link' }).click();

    await expect(page.getByLabel('Expiry (optional)')).toBeFocused();
    await expect(page.getByText('Expiry must be in the future')).toBeVisible();
  });
});
