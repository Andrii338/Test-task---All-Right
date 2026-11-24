import { test, expect } from '@playwright/test';
import { Shop } from '../support/shop';

test("Return from the cart to the product catalog", async ({ page }) => {
  await new Shop(page).login();
  await page.getByTestId("add-to-cart-sauce-labs-bike-light").click();
  await page.getByTestId("shopping-cart-link").click();
  await expect(page.getByTestId("inventory-item")).toHaveCount(1);
  await expect(page.getByTestId("inventory-item-name")).toHaveText("Sauce Labs Bike Light");
  await page.getByTestId("continue-shopping").click();
  await expect(page.getByTestId("title")).toHaveText("Products");
  await expect(page.getByTestId("shopping-cart-badge")).toHaveText("1");
});
