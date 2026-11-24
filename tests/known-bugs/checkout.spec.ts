import { test, expect } from '../support/ui-fixtures';
import { products } from '../support/shop';

test('BUG-UI-01 checkout should reject whitespace-only customer information', async ({ shop, page }, testInfo) => {
  await shop.add(products.backpack.name);
  await shop.startCheckout();
  await shop.fillCustomer('   ', '   ', '   ');
  for (const field of ['firstName', 'lastName', 'postalCode']) {
    await expect(page.getByTestId(field)).toHaveValue('   ');
  }
  await page.getByTestId('continue').click();
  // Setup and transport failures must remain ordinary failures, not expected bugs.
  await expect(page).toHaveURL(/\/checkout-step-(one|two)\.html$/);
  await testInfo.attach('checkout-after-whitespace-input', {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
  });

  test.fail(true, 'BUG-UI-01: whitespace-only values bypass required-field validation; see README');
  await expect(page).toHaveURL(/\/checkout-step-one\.html$/);
  await expect(page.getByTestId('error')).toBeVisible();
});
