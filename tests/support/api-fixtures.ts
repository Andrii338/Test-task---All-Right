import { randomUUID } from 'node:crypto';
import { test as base, expect, type APIRequestContext } from '@playwright/test';

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: { checkin: string; checkout: string };
  additionalneeds: string;
}

export function bookingData(): Booking {
  return {
    firstname: 'Automation',
    // UUID у прізвищі відрізняє записи паралельних запусків на спільному демосервісі.
    lastname: `QA-${randomUUID()}`,
    totalprice: 123,
    depositpaid: true,
    bookingdates: { checkin: '2027-02-10', checkout: '2027-02-14' },
    additionalneeds: 'Breakfast',
  };
}

export class BookingApi {
  private token?: string;
  private readonly ownedBookings = new Map<number, string>();

  constructor(readonly request: APIRequestContext) {}

  async authenticate() {
    const response = await this.request.post('/auth', {
      data: { username: 'admin', password: 'password123' },
    });
    expect(response.status(), 'Authentication HTTP status').toBe(200);
    const body = await response.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.token.length).toBeGreaterThan(0);
    this.token = body.token;
  }

  async create(data: Booking) {
    const response = await this.request.post('/booking', { data });
    expect(response.status(), 'CreateBooking HTTP status').toBe(200);
    const body = await response.json();
    expect(Number.isInteger(body.bookingid) && body.bookingid > 0).toBe(true);
    // Запам’ятовуємо власника до перевірки вмісту, щоб у разі помилки фікстура могла прибрати запис.
    this.ownedBookings.set(body.bookingid, data.lastname);
    expect(body.booking).toEqual(data);
    return body.bookingid as number;
  }

  async read(id: number) {
    return this.request.get(`/booking/${id}`);
  }

  async update(id: number, data: Booking) {
    return this.request.put(`/booking/${id}`, {
      headers: { Cookie: await this.authCookie() }, data,
    });
  }

  async remove(id: number) {
    return this.request.delete(`/booking/${id}`, {
      headers: { Cookie: await this.authCookie() },
    });
  }

  async cleanup() {
    const failures: string[] = [];
    for (const [id, lastname] of this.ownedBookings) {
      try {
        const current = await this.read(id);
        // Тест міг уже видалити запис. Якщо ID ще існує, перед видаленням звіряємо прізвище.
        if (current.status() === 404) continue;
        expect(current.status(), `Cleanup read ${id}`).toBe(200);
        expect((await current.json()).lastname, `Refuse to delete booking ${id} owned by another run`).toBe(lastname);
        expect((await this.remove(id)).status(), `Cleanup delete ${id}`).toBe(201);
        expect((await this.read(id)).status(), `Cleanup verify ${id}`).toBe(404);
      } catch (error) {
        failures.push(`Booking ${id}: ${String(error)}`);
      }
    }
    this.ownedBookings.clear();
    if (failures.length) throw new Error(`Cleanup failed:\n${failures.join('\n')}`);
  }

  private async authCookie() {
    if (!this.token) await this.authenticate();
    return `token=${this.token}`;
  }
}

export const test = base.extend<{ bookingApi: BookingApi }>({
  bookingApi: async ({ request }, use) => {
    const api = new BookingApi(request);
    try {
      await use(api);
    } finally {
      // Прибираємо бронювання і тоді, коли тест зупинився на невдалій перевірці.
      await api.cleanup();
    }
  },
});

export { expect };
