import { test as base, expect } from '@playwright/test';
import { Shop } from './shop';

export const test = base.extend<{ shop: Shop }>({
  shop: async ({ page }, use) => {
    const shop = new Shop(page);
    await shop.login();
    await expect(page).toHaveURL(/\/inventory\.html$/);
    await use(shop);
  },
});

export { expect };
