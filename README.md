# QA Automation Engineer Middle

Тестове завдання для [SauceDemo](https://www.saucedemo.com) і [Restful Booker](https://restful-booker.herokuapp.com/apidoc/). Playwright Test + TypeScript використовуються і для браузера, і для HTTP-запитів. Основний набір містить 9 UI-тестів і 4 API-тести; окремо є регресійна перевірка відомого UI-дефекту.

## Швидкий старт

Потрібні Node.js 22 LTS, npm і доступ до обох демосервісів. Версії npm-пакетів зафіксовано в `package-lock.json`.

```bash
git clone https://github.com/Andrii338/Test-task---All-Right.git
cd Test-task---All-Right
nvm use                  # за наявності nvm
npm ci
npx playwright install chromium
npm run typecheck
npm test
npm run report
```

На Linux для встановлення системних бібліотек браузера: `npx playwright install --with-deps chromium`.

| Команда | Призначення |
| --- | --- |
| `npm test` | Усі 16 тестів, включно з двома згенерованими тестами й відомим дефектом |
| `npm run test:ui` | 6 основних і 3 негативні UI-тести |
| `npm run test:api` | API lifecycle і 3 негативні API-тести; браузер не потрібен |
| `npm run test:bugs` | Відтворення BUG-UI-01 з `test.fail` |
| `npm run test:generated` | Два приклади, створені бонусним генератором |
| `npm run test:headed` | UI-тести з видимим браузером |
| `npm run test:debug` | Покрокове налагодження UI |
| `npm run typecheck` | Перевірка TypeScript |
| `npm run report` | Відкрити HTML-звіт останнього запуску |

За потреби адреси можна перевизначити змінними середовища:

```bash
UI_BASE_URL=https://www.saucedemo.com npm run test:ui
API_BASE_URL=https://restful-booker.herokuapp.com npm run test:api
```

Використано публічні demo credentials: `standard_user / secret_sauce` і `admin / password123`. Особисті облікові дані та секрети не потрібні.

## Покриття

| ID | Перевірка |
| --- | --- |
| UI-01 | Успішний логін standard_user і відкриття каталогу |
| UI-02 | 6 унікальних товарів, непорожні назви, додатні ціни, завантажені зображення, кнопки додавання |
| UI-03 | Усі 4 режими сортування за назвою та ціною |
| UI-04 | Додавання двох товарів, збереження після reload, ціни, видалення вибраного й останнього товару, badge |
| UI-05 | Чекаут двох товарів, subtotal $39.98, tax $3.20, total $43.18, підтвердження, очищення кошика |
| UI-06 | Скасування введення даних повертає до кошика й зберігає товар |
| UI-N01 | Неправильний пароль |
| UI-N02 | Порожнє ім’я користувача |
| UI-N03 | Послідовна перевірка обов’язкових first name, last name і postal code |
| API-01 | Auth → create → GET → PUT → GET → DELETE → GET 404 |
| API-N01 | Неправильні credentials: причина помилки та відсутність токена |
| API-N02 | PUT без авторизації: 403 і незмінені дані |
| API-N03 | DELETE з невалідним токеном: 403 і збережене бронювання |
| BUG-UI-01 | Пробіли замість даних покупця мають блокувати чекаут |

UI-контексти ізольовані для кожного тесту. API-тести генерують унікальний `lastname` через UUID, працюють лише зі своїми ID й виконують teardown навіть після падіння. Перед прибиранням перевіряється власник запису; після видалення — 404. Різні API-кейси не залежать від порядку запуску. У lifecycle незмінний UUID у прізвищі зберігає маркер власності.

Усі асерти на стан UI використовують очікування Playwright, довільних затримок немає. Суми перевіряються в цілих центах. Перевірка сортування порівнює результат із повним початковим набором, а не з порожнім масивом.

HTTP-коди звірено з [документацією сервісу](https://restful-booker.herokuapp.com/apidoc/): create — 200, update — 200, delete — 201. Неправильна авторизація фактично повертає 200 з `{ "reason": "Bad credentials" }`; це зафіксовано як контракт демосервісу.

## CI і звіти

[Workflow](.github/workflows/playwright.yml) запускається на кожен `push`, на `pull_request` і вручну через `workflow_dispatch`. Ubuntu runner встановлює Node.js 22, залежності через `npm ci`, перевіряє типи, встановлює Chromium і запускає весь набір.

Артефакт `playwright-report-<attempt>` зберігається 14 днів, зокрема після падіння тестів. Він містить HTML, JUnit XML, JSON і доступні traces, screenshots та video. Після скасування job артефакт може бути відсутній. Локальні звіти та `node_modules` виключені з Git.

Завантажений звіт можна відкрити так:

```bash
npx playwright show-report /path/to/extracted/playwright-report
npx playwright show-trace /path/to/trace.zip
```

Локально retries вимкнені; у CI дозволений один retry, обидві спроби видно у звіті. `test.only` заборонений у CI. Два workers обмежують навантаження на спільні демосервіси.

BUG-UI-01 має явний `test.fail` лише після успішного логіну, заповнення форми й отримання очікуваної сторінки. Це expected failure, а не успішна перевірка продукту. Після виправлення дефекту Playwright повідомить unexpected pass і попросить прибрати анотацію. Помилки підготовки тесту залишаються звичайними падіннями.

## Фактична перевірка

Перевірка основного завдання до додавання бонусу, 24 листопада 2026 року:

- TypeScript перевірено; 14 тестів розпізнаються runner-ом.
- 4 API-тести виконано проти реального Restful Booker успішно.
- UI-сценарії перевірено через доступний браузер: логін, каталог, 4 сортування, reload кошика, видалення, скасування, підсумки, завершення, негативні логіни й обов’язкові поля. Докази — [browser-verification.json](docs/evidence/browser-verification.json).
- Локальний Playwright UI runner заблокований sandbox macOS на етапі запуску Chromium: `MachPortRendezvous ... Permission denied (1100)`. Це не результат асертів UI-тестів. Див. [ui-sandbox-run.json](docs/evidence/ui-sandbox-run.json).
- Повний Playwright-прогін виконано в [GitHub Actions run 1](https://github.com/Andrii338/Test-task---All-Right/actions/runs/45463249651) для commit `2c3a879`: усі 9 UI- і 4 API-тести пройшли з першої спроби; BUG-UI-01 відтворився як expected failure. Несподіваних падінь, пропусків і повторних спроб немає. Runner показує `14 passed`, оскільки враховує очікуване падіння як правильний результат тесту; продуктових успішних перевірок — 13.
- Підтверджено [артефакт зі звітами](https://github.com/Andrii338/Test-task---All-Right/actions/runs/45463249651/artifacts/14953626539); строк зберігання до 8 грудня 2026 року. Постійний підсумок — [ci-run.json](docs/evidence/ci-run.json).

## Знайдені баги

### BUG-UI-01 Пробіли проходять валідацію даних покупця

**Середовище:** SauceDemo, standard_user, браузерна перевірка 24.11.2026. **Severity:** Medium. **Priority:** P2.

**Передумова:** нова сесія, у кошику Sauce Labs Backpack.

**Кроки:**

1. Увійти як `standard_user / secret_sauce`.
2. Додати Sauce Labs Backpack і відкрити Cart → Checkout.
3. У First Name, Last Name та Zip/Postal Code ввести по три пробіли (`"   "`).
4. Натиснути Continue, потім Finish.

**Очікувано:** пробіли обрізаються; порожні після обрізання значення викликають помилку обов’язкового поля, замовлення не створюється. Це очікування виведено з наявної валідації порожніх полів; детальний формат імен та індексу в завданні не заданий.

**Фактично:** відкривається `checkout-step-two.html`, а після Finish — `checkout-complete.html` із `Thank you for your order!`. Дані покупця не містять жодного непробільного символу.

**Докази:** [дані відтворення](docs/evidence/ui-whitespace.json), [скриншот завершеного замовлення](docs/evidence/ui-whitespace-order-complete.jpg). Регресія: [checkout.spec.ts](tests/known-bugs/checkout.spec.ts).

### BUG-API-01 Порожній JSON спричиняє внутрішню помилку сервера

**Середовище:** Restful Booker, 24.11.2026, 18:38:07 UTC. **Severity:** Medium. **Priority:** P2.

**Передумова:** авторизація для створення бронювання не потрібна.

**Кроки:** надіслати запит без обов’язкових полів:

```bash
curl -i https://restful-booker.herokuapp.com/booking \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{}'
```

**Очікувано:** контрольована відповідь 4xx з помилками валідації, без внутрішнього падіння. Точний код, наприклад 400, та формат повідомлення потребують погодження: документація позначає поля обов’язковими, але не задає error contract для цього запиту.

**Фактично:** HTTP 500, тіло `Internal Server Error` замість контрольованої помилки клієнтських даних.

**Доказ:** [api-empty-booking.json](docs/evidence/api-empty-booking.json). Це окрема дослідницька перевірка; припущення про конкретний 4xx-код не додане до основного API suite.

## Свідомо поза обсягом

Firefox, WebKit, мобільні viewport-и, інші користувачі SauceDemo, logout, dynamic catalog і PDF-квитанції; visual regression, accessibility-аудит, performance/load/security testing. Для API не покрито PATCH, фільтри списку, XML і form encoding, повну матрицю невалідних payload-ів та конкурентне редагування.

Це спільні демосервіси: їх перезапуск або стороння зміна даних може зірвати тест. UUID і перевірка власника зменшують ризик. При жорсткому завершенні процесу teardown не гарантований; окремий janitor і виділене тестове середовище не входять у завдання.

Бонусний генератор перетворює текстовий тест-кейс на Playwright-тест через headless Codex. [Запуск та приклади](bonus/README.md). Взаємодію з ШІ, реальні помилки й виправлення описано в [AI_WORKLOG.md](AI_WORKLOG.md); інструкції агента — у [AGENTS.md](AGENTS.md).
