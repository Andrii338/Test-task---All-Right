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
  const error = page.getByTestId('error');
  const finish = page.getByTestId('finish');
  await expect(error.or(finish)).toBeVisible();

  const path = new URL(page.url()).pathname;
  if (path === '/checkout-step-one.html') {
    await expect(error).toHaveText('Error: First Name is required');
  } else {
    await expect(page).toHaveURL(/\/checkout-step-two\.html$/);
    await expect(finish).toBeVisible();
  }
  await testInfo.attach('checkout-after-whitespace-input', {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
  });

  // Keep the expected failure scoped to the known transition to the overview.
  test.fail(true, 'BUG-UI-01: whitespace-only values open the checkout overview');
  expect(path).toBe('/checkout-step-one.html');
});
