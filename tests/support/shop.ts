import { type Locator, type Page } from '@playwright/test';

export const products = {
  backpack: { name: 'Sauce Labs Backpack', priceInCents: 2999 },
  bikeLight: { name: 'Sauce Labs Bike Light', priceInCents: 999 },
} as const;

export class Shop {
  constructor(readonly page: Page) {}

  async login(username = 'standard_user', password = 'secret_sauce') {
    await this.page.goto('/');
    await this.page.getByTestId('username').fill(username);
    await this.page.getByTestId('password').fill(password);
    await this.page.getByTestId('login-button').click();
  }

  item(name: string): Locator {
    return this.page.getByTestId('inventory-item').filter({
      has: this.page.getByTestId('inventory-item-name').filter({ hasText: name }),
    });
  }

  async add(name: string) {
    await this.item(name).getByRole('button', { name: 'Add to cart', exact: true }).click();
  }

  async openCart() {
    await this.page.getByTestId('shopping-cart-link').click();
  }

  async startCheckout() {
    await this.openCart();
    await this.page.getByTestId('checkout').click();
  }

  async fillCustomer(firstName = 'Andrii', lastName = 'Tester', postalCode = '01001') {
    await this.page.getByTestId('firstName').fill(firstName);
    await this.page.getByTestId('lastName').fill(lastName);
    await this.page.getByTestId('postalCode').fill(postalCode);
  }
}

export function moneyInCents(text: string): number {
  const amount = text.match(/\$(\d+)\.(\d{2})\b/);
  if (!amount) throw new Error(`Expected dollar amount, received: ${text}`);
  return Number(amount[1]) * 100 + Number(amount[2]);
}
