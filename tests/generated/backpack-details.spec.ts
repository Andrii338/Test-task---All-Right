import { test, expect } from '@playwright/test';
import { Shop } from '../support/shop';

test("Open the backpack details from the SauceDemo catalog", async ({ page }) => {
  await new Shop(page).login();
  await page.getByTestId("item-4-title-link").click();
  await expect(page.getByTestId("inventory-item-name")).toHaveText("Sauce Labs Backpack");
  await expect(page.getByTestId("inventory-item-price")).toHaveText("$29.99");
  await page.getByTestId("back-to-products").click();
  await expect(page.getByTestId("title")).toHaveText("Products");
  await expect(page.getByTestId("inventory-item")).toHaveCount(6);
});
