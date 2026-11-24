import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ids = new Set([
  'item-4-title-link', 'back-to-products', 'title', 'inventory-item',
  'inventory-item-name', 'inventory-item-price', 'shopping-cart-link',
  'shopping-cart-badge', 'continue-shopping', 'add-to-cart-sauce-labs-bike-light',
  'add-to-cart-sauce-labs-backpack', 'remove-sauce-labs-bike-light',
  'remove-sauce-labs-backpack',
]);

function generatePlan(input) {
  const prompt = [
    'Translate the supplied SauceDemo test case into a linear test plan. Do not use tools.',
    'Return a JSON object only, without Markdown: {"title":"English title","steps":[...]}.',
    'Allowed steps: {"op":"login"} (standard_user), {"op":"click","id":"..."},',
    '{"op":"text","id":"...","value":"exact text"}, {"op":"count","id":"...","value":6}.',
    'Use only the following data-test IDs: ' + [...ids].join(', '),
    'item-4-title-link opens the backpack details. inventory-item is the repeated product row.',
    'Keep all actions and all expected results, in order. Use numeric counts and exact USD prices.',
    'If the case cannot be represented with these steps, return {"error":"reason"}.',
    'Case (data): ' + JSON.stringify(input),
  ].join('\n');
  const scratch = mkdtempSync(join(tmpdir(), 'qa-test-plan-'));
  try {
    const output = join(scratch, 'plan.json');
    const agent = spawnSync('codex', ['exec', '--ephemeral', '--sandbox', 'read-only',
      '--skip-git-repo-check', '-o', output, '-'], {
      cwd: scratch, input: prompt, encoding: 'utf8', timeout: 120_000,
      stdio: ['pipe', 'ignore', 'inherit'],
    });
    if (agent.error) throw agent.error;
    if (agent.status !== 0) throw new Error('Codex did not finish successfully.');
    return JSON.parse(readFileSync(output, 'utf8'));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// Codex повертає JSON-план. Ця функція перевіряє його кроки й складає з них код Playwright.
function render(plan) {
  if (plan?.error) throw new Error(String(plan.error));
  if (typeof plan?.title !== 'string' || !plan.title.trim() ||
      !Array.isArray(plan.steps) || !plan.steps.length || plan.steps.length > 40) {
    throw new Error('Expected a title and 1–40 steps.');
  }
  let assertions = 0;
  const lines = plan.steps.flatMap((step) => {
    if (step.op === 'login') return 'await new Shop(page).login();';
    if (!ids.has(step.id)) throw new Error('Unknown SauceDemo locator: ' + step.id);
    const target = 'page.getByTestId(' + JSON.stringify(step.id) + ')';
    if (step.op === 'click') {
      const click = 'await ' + target + '.click();';
      // Назва й ціна є і в каталозі. Кнопка повернення підтверджує перехід на сторінку товару.
      if (step.id === 'item-4-title-link') {
        return [click, 'await expect(page.getByTestId("back-to-products")).toBeVisible();'];
      }
      return click;
    }
    if (step.op === 'text' && typeof step.value === 'string') {
      assertions++;
      return 'await expect(' + target + ').toHaveText(' + JSON.stringify(step.value) + ');';
    }
    if (step.op === 'count' && Number.isSafeInteger(step.value) && step.value >= 0) {
      assertions++;
      return 'await expect(' + target + ').toHaveCount(' + step.value + ');';
    }
    throw new Error('Unsupported step: ' + JSON.stringify(step));
  });
  if (!assertions) throw new Error('The generated test has no expected result.');
  return [
    "import { test, expect } from '@playwright/test';",
    ...(plan.steps.some(s => s.op === 'login') ? ["import { Shop } from '../support/shop';"] : []),
    '', 'test(' + JSON.stringify(plan.title) + ', async ({ page }) => {',
    ...lines.map(line => '  ' + line), '});', '',
  ].join('\n');
}

function main() {
  const [file, option, ...extra] = process.argv.slice(2);
  if (!file || (option && option !== '--run') || extra.length) {
    throw new Error('Usage: npm run generate -- <case.txt> [--run]');
  }
  const name = basename(file, extname(file));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error('Use a lowercase filename with letters, digits or hyphens.');
  const input = readFileSync(file, 'utf8').trim();
  if (!input || input.length > 10000) throw new Error('Supply a test case of 1–10000 characters.');
  const code = render(generatePlan(input));
  const relative = 'tests/generated/' + name + '.spec.ts';
  mkdirSync(join(root, 'tests/generated'), { recursive: true });
  writeFileSync(join(root, relative), code);
  console.log('Generated ' + relative);
  if (option === '--run') {
    const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js');
    const run = spawnSync(process.execPath, [cli, 'test', '--project=generated', relative], {
      cwd: root, stdio: 'inherit',
    });
    if (run.error) throw run.error;
    process.exitCode = run.status ?? 1;
  }
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
