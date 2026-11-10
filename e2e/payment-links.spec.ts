import { expect, test } from '@playwright/test';
import { fillCreateForm, linkCards, openApp } from './helpers.ts';

test('create a link, then filter the list by status (happy path)', async ({ page }) => {
  await openApp(page);
  await expect(linkCards(page)).toHaveCount(5);

  // Create a link.
  await fillCreateForm(page, {
    amount: '1,499.50',
    description: 'Logo design for Café Mocha',
    email: 'owner@cafemocha.in',
  });
  await page.getByRole('button', { name: 'Create payment link' }).click();

  await expect(page.getByText('Payment link created')).toBeVisible();
  await expect(linkCards(page)).toHaveCount(6);
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
  await page.getByRole('button', { name: /^All \(6\)/ }).click();
  await expect(linkCards(page)).toHaveCount(6);
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
  await expect(linkCards(page)).toHaveCount(5);
});

test('a load failure shows an error with a retry button', async ({ page }) => {
  await page.goto('/?mock=reset,fail-load');

  await expect(page.getByRole('alert')).toContainText("We couldn't load your payment links.");
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('partial payments: create, pay part, pay the rest, and it survives a reload', async ({
  page,
}) => {
  await openApp(page);

  // Create a link that allows partial payments.
  await fillCreateForm(page, {
    amount: '1000',
    description: 'Guitar course: 4 weeks',
    email: 'neha@example.com',
  });
  await page.getByLabel('Allow partial payments').check();
  await page.getByLabel('Minimum first payment (₹)').fill('300');
  await page.getByRole('button', { name: 'Create payment link' }).click();
  const card = linkCards(page).filter({ hasText: 'Guitar course: 4 weeks' });
  await expect(card).toContainText('Active');
  await expect(card).toContainText('Paid ₹0.00 · Due ₹1,000.00');

  // A first payment below the minimum is refused.
  const recordButton = page.getByRole('button', { name: 'Record payment: Guitar course: 4 weeks' });
  await recordButton.click();
  const amount = page.getByLabel('Amount received (₹)');
  await expect(amount).toBeFocused();
  await amount.fill('200');
  await page.getByRole('button', { name: 'Save payment' }).click();
  await expect(page.getByText('The first payment must be at least ₹300.00')).toBeVisible();

  // Pay ₹400: Partially paid.
  await amount.fill('400');
  await page.getByRole('button', { name: 'Save payment' }).click();
  await expect(card).toContainText('Partially paid');
  await expect(card).toContainText('Paid ₹400.00 · Due ₹600.00');
  await expect(recordButton).toBeFocused();

  // It shows under the new "Partially paid" filter.
  await page.getByRole('button', { name: /^Partially paid \(2\)/ }).click();
  await expect(card).toBeVisible();

  // Survives a page reload (no ?mock=reset this time).
  await page.goto('/?status=Partially+paid');
  await expect(card).toContainText('Paid ₹400.00 · Due ₹600.00');

  // Pay the remaining ₹600 (pre-filled): Paid, and the button disappears.
  await recordButton.click();
  await expect(page.getByLabel('Amount received (₹)')).toHaveValue('600.00');
  await page.getByRole('button', { name: 'Save payment' }).click();
  await expect(page.getByText(/It is now fully paid\./)).toBeVisible();
  await page.getByRole('button', { name: /^Paid \(2\)/ }).click();
  await expect(card).toContainText('Paid ₹1,000.00 · Due ₹0.00');
  await expect(recordButton).toHaveCount(0);
});

test('a link without partial payments must be paid in full', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Record payment: Bulk order: 40 notebooks' }).click();
  await page.getByLabel('Amount received (₹)').fill('1000');
  await page.getByRole('button', { name: 'Save payment' }).click();

  await expect(page.getByText('This link must be paid in full (₹6,000.00)')).toBeVisible();
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
    await expect(card.getByRole('button', { name: /Record payment/ })).toHaveCount(0);
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
