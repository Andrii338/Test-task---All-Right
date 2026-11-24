import { test, expect } from '../support/ui-fixtures';
import { Shop, moneyInCents, products } from '../support/shop';

test('UI-01 standard user can log in', async ({ page }) => {
  await new Shop(page).login();
  await expect(page).toHaveURL(/\/inventory\.html$/);
  await expect(page.getByTestId('title')).toHaveText('Products');
  await expect(page.getByTestId('inventory-list')).toBeVisible();
});

test('UI-02 catalog displays six products with names prices and images', async ({ shop, page }) => {
  const items = page.getByTestId('inventory-item');
  await expect(items).toHaveCount(6);
  const names = await items.getByTestId('inventory-item-name').allTextContents();
  expect(new Set(names).size).toBe(6);
  for (const item of await items.all()) {
    await expect(item.getByTestId('inventory-item-name')).not.toHaveText('');
    expect(moneyInCents(await item.getByTestId('inventory-item-price').innerText())).toBeGreaterThan(0);
    await expect(item.getByRole('img')).toBeVisible();
    await expect.poll(() => item.getByRole('img').evaluate(
      (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
    ), { message: 'Product image must load successfully' }).toBe(true);
    await expect(item.getByRole('button', { name: 'Add to cart', exact: true })).toBeEnabled();
  }
  await expect(shop.item(products.backpack.name)).toHaveCount(1);
});

test('UI-03 all four catalog sort options order the full product list', async ({ shop, page }) => {
  const names = page.getByTestId('inventory-item-name');
  const prices = page.getByTestId('inventory-item-price');
  await expect(names).toHaveCount(6);
  await expect(prices).toHaveCount(6);
  const originalNames = await names.allTextContents();
  const originalPrices = (await prices.allTextContents()).map(moneyInCents);

  for (const option of ['za', 'az', 'lohi', 'hilo']) {
    await test.step(`Sort ${option}`, async () => {
      await page.getByTestId('product-sort-container').selectOption(option);
      await expect(names).toHaveCount(6);
      if (option === 'az' || option === 'za') {
        const sorted = [...originalNames].sort((a, b) => a.localeCompare(b));
        await expect(names).toHaveText(option === 'za' ? sorted.reverse() : sorted);
      } else {
        const sorted = [...originalPrices].sort((a, b) => a - b);
        await expect.poll(async () => (await prices.allTextContents()).map(moneyInCents)).toEqual(
          option === 'hilo' ? sorted.reverse() : sorted,
        );
      }
    });
  }
});

test('UI-04 cart persists on reload and removes only the selected product', async ({ shop, page }) => {
  await shop.add(products.backpack.name);
  await shop.add(products.bikeLight.name);
  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('2');
  await shop.openCart();
  await page.reload();
  await expect(page.getByTestId('inventory-item')).toHaveCount(2);
  await expect(shop.item(products.backpack.name).getByTestId('inventory-item-price')).toHaveText('$29.99');
  await expect(shop.item(products.bikeLight.name).getByTestId('inventory-item-price')).toHaveText('$9.99');
  await shop.item(products.backpack.name).getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(shop.item(products.backpack.name)).toHaveCount(0);
  await expect(shop.item(products.bikeLight.name)).toHaveCount(1);
  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
  await shop.item(products.bikeLight.name).getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByTestId('inventory-item')).toHaveCount(0);
  await expect(page.getByTestId('shopping-cart-badge')).toHaveCount(0);
});

test('UI-05 checkout calculates totals completes order and empties cart', async ({ shop, page }) => {
  await shop.add(products.backpack.name);
  await shop.add(products.bikeLight.name);
  await shop.startCheckout();
  await shop.fillCustomer();
  await page.getByTestId('continue').click();
  await expect(page).toHaveURL(/\/checkout-step-two\.html$/);
  await expect(page.getByTestId('inventory-item-name')).toHaveText([
    products.backpack.name, products.bikeLight.name,
  ]);
  const subtotal = products.backpack.priceInCents + products.bikeLight.priceInCents;
  const tax = Math.round(subtotal * 0.08);
  expect(moneyInCents(await page.getByTestId('subtotal-label').innerText())).toBe(subtotal);
  expect(moneyInCents(await page.getByTestId('tax-label').innerText())).toBe(tax);
  expect(moneyInCents(await page.getByTestId('total-label').innerText())).toBe(subtotal + tax);
  await page.getByTestId('finish').click();
  await expect(page).toHaveURL(/\/checkout-complete\.html$/);
  await expect(page.getByTestId('complete-header')).toHaveText('Thank you for your order!');
  await expect(page.getByTestId('shopping-cart-badge')).toHaveCount(0);
  await shop.openCart();
  await expect(page.getByTestId('inventory-item')).toHaveCount(0);
});

test('UI-06 cancelling customer information returns to cart without losing products', async ({ shop, page }) => {
  await shop.add(products.backpack.name);
  await shop.startCheckout();
  await page.getByTestId('cancel').click();
  await expect(page).toHaveURL(/\/cart\.html$/);
  await expect(shop.item(products.backpack.name)).toHaveCount(1);
  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
});

test('UI-N01 incorrect password is rejected', async ({ page }) => {
  await new Shop(page).login('standard_user', 'incorrect-password');
  await expect(page.getByTestId('error')).toHaveText(
    'Epic sadface: Username and password do not match any user in this service',
  );
  await expect(page.getByTestId('login-button')).toBeVisible();
  await expect(page).not.toHaveURL(/\/inventory\.html$/);
});

test('UI-N02 empty username is rejected', async ({ page }) => {
  await new Shop(page).login('', 'secret_sauce');
  await expect(page.getByTestId('error')).toHaveText('Epic sadface: Username is required');
  await expect(page.getByTestId('login-button')).toBeVisible();
});

test('UI-N03 checkout requires first name last name and postal code', async ({ shop, page }) => {
  await shop.add(products.backpack.name);
  await shop.startCheckout();
  for (const [field, message, value] of [
    ['firstName', 'Error: First Name is required', 'Andrii'],
    ['lastName', 'Error: Last Name is required', 'Tester'],
    ['postalCode', 'Error: Postal Code is required', '01001'],
  ]) {
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('error')).toHaveText(message);
    await expect(page).toHaveURL(/\/checkout-step-one\.html$/);
    await page.getByTestId(field).fill(value);
  }
});
