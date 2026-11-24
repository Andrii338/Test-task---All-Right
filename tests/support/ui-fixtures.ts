import { test as base, expect } from '@playwright/test';
import { Shop } from './shop';

export const test = base.extend<{ shop: Shop }>({
  // Тести з shop починаються у відкритому каталозі. Тести входу беруть лише page й вводять власні дані.
  shop: async ({ page }, use) => {
    const shop = new Shop(page);
    await shop.login();
    await expect(page).toHaveURL(/\/inventory\.html$/);
    await use(shop);
  },
});

export { expect };
