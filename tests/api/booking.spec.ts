import { test, expect, bookingData } from '../support/api-fixtures';

test('API-01 authenticate create read update delete and verify absence', async ({ bookingApi }) => {
  await test.step('Authenticate', async () => bookingApi.authenticate());
  const original = bookingData();
  const id = await test.step('Create booking', async () => bookingApi.create(original));

  await test.step('Read persisted booking', async () => {
    const response = await bookingApi.read(id);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(original);
  });

  // Зберігаємо унікальне прізвище, за яким фікстура впізнає це бронювання під час прибирання.
  const updated = {
    ...original, firstname: 'Updated', totalprice: 456, depositpaid: false,
    bookingdates: { checkin: '2027-03-01', checkout: '2027-03-07' },
    additionalneeds: 'Dinner',
  };
  await test.step('Update all mutable fields and verify persistence', async () => {
    const response = await bookingApi.update(id, updated);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(updated);
    // Окремий GET перевіряє, що сервер зберіг зміни після PUT.
    const persisted = await bookingApi.read(id);
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual(updated);
  });

  await test.step('Delete and verify 404', async () => {
    const deleted = await bookingApi.remove(id);
    expect(deleted.status()).toBe(201);
    const missing = await bookingApi.read(id);
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toBe('Not Found');
  });
});

test('API-N01 invalid credentials return a reason and no token', async ({ request }) => {
  const response = await request.post('/auth', {
    data: { username: 'admin', password: 'incorrect-password' },
  });
  expect(response.status()).toBe(200);
  // Restful Booker повертає HTTP 200 навіть за хибного пароля. Відмову видно в тілі відповіді.
  const body = await response.json();
  expect(body).toEqual({ reason: 'Bad credentials' });
  expect(body).not.toHaveProperty('token');
});

test('API-N02 update without authentication is forbidden and leaves booking unchanged', async ({ bookingApi, request }) => {
  const original = bookingData();
  const id = await bookingApi.create(original);
  // Прямий запит пропускає авторизацію, яку BookingApi.update додає автоматично.
  const response = await request.put(`/booking/${id}`, {
    data: { ...original, totalprice: 999 },
  });
  expect(response.status()).toBe(403);
  expect(await response.text()).toBe('Forbidden');
  const persisted = await bookingApi.read(id);
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toEqual(original);
});

test('API-N03 delete with invalid token is forbidden and leaves booking present', async ({ bookingApi, request }) => {
  const original = bookingData();
  const id = await bookingApi.create(original);
  // Передаємо хибний токен явно. Після відмови GET має повернути початкове бронювання.
  const response = await request.delete(`/booking/${id}`, {
    headers: { Cookie: 'token=invalid-automation-token' },
  });
  expect(response.status()).toBe(403);
  expect(await response.text()).toBe('Forbidden');
  const persisted = await bookingApi.read(id);
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toEqual(original);
});
