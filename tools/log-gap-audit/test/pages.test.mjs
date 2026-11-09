// Static page tests: both language pages carry the exact SPEC metadata,
// the required element ids, the CSP meta, no remote assets, and the app
// carries both locales. No browser is involved; this mirrors scripts/check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const requiredIds = [
  'main', 'records', 'threshold', 'fileInput', 'findBtn', 'exampleBtn', 'resetBtn',
  'cancelBtn', 'downloadBtn', 'status', 'errorBox', 'exampleNote', 'findingsSection',
  'findingsSummary', 'findingsBody', 'pagination', 'prevPageBtn', 'nextPageBtn', 'pageInfo',
];

test('zh page: exact SPEC metadata and all required ids', async () => {
  const html = await read('public/index.html');
  assert.ok(html.includes('<html lang="zh-Hant">'));
  assert.ok(html.includes('<h1>記錄序號與時間缺口檢查</h1>'));
  assert.ok(html.includes('<title>記錄序號與時間缺口檢查｜Gloss Tools</title>'));
  assert.ok(html.includes('維運人員從測試資料匯出一段序號和相對毫秒，要分清哪兩行間缺序號、時間倒退、或間隔超過檢查門檻。'));
  assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
  assert.ok(html.includes('worker-src blob:'));
  assert.ok(html.includes('href="../../"'));
  assert.ok(html.includes('href="en/index.html"'));
  assert.ok(html.includes('會先依序號排序嗎？'));
  assert.ok(html.includes('超過門檻如何定義？'));
  assert.ok(html.includes('切換語言或離開頁面會失去草稿。'));
  for (const id of requiredIds) assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  assert.ok(!/src="https?:\/\//.test(html), 'no remote script');
  assert.ok(!/href="https?:\/\//.test(html), 'no remote stylesheet');
});

test('en page: exact SPEC metadata and all required ids', async () => {
  const html = await read('public/en/index.html');
  assert.ok(html.includes('<html lang="en">'));
  assert.ok(html.includes('<h1>Log Sequence and Time Gap Audit</h1>'));
  assert.ok(html.includes('<title>Log Sequence and Time Gap Audit | Gloss Tools</title>'));
  assert.ok(html.includes('Find sequence gaps, repeats and time reversals in adjacent log rows. Inspect the original row pairs and exact differences.'));
  assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
  assert.ok(html.includes('worker-src blob:'));
  assert.ok(html.includes('href="../../en/"'));
  assert.ok(html.includes('href="../index.html"'));
  assert.ok(html.includes('Are rows sorted first?'));
  assert.ok(html.includes('When is a time gap flagged?'));
  assert.ok(html.includes('Switching language or leaving the page discards the draft.'));
  for (const id of requiredIds) assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  assert.ok(!/src="https?:\/\//.test(html), 'no remote script');
  assert.ok(!/href="https?:\/\//.test(html), 'no remote stylesheet');
});

test('app.js carries both locales and the worker wiring', async () => {
  const app = await read('public/js/app.js');
  assert.ok(app.includes("'zh-Hant'"));
  assert.ok(app.includes("'en'"));
  assert.ok(app.includes('worker-source.mjs'));
  assert.ok(app.includes('new Worker'));
  assert.ok(app.includes('createObjectURL'));
  assert.ok(app.includes('revokeObjectURL'));
  assert.ok(!/\.innerHTML/.test(app), 'no innerHTML');
  assert.ok(!/localStorage|sessionStorage/.test(app), 'no persistent storage');
});

test('both pages keep native submission blocked and bind the CSP-compatible submit handler', async (t) => {
  class Element extends EventTarget {
    dataset = {};
    setAttribute() {}
    removeAttribute() {}
  }

  for (const [page, lang] of [['public/index.html', 'zh-Hant'], ['public/en/index.html', 'en']]) {
    await t.test(lang, async (subtest) => {
      const html = await read(page);
      const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)]
        .map(([, id]) => [id, new Element()]));
      globalThis.document = {
        documentElement: { lang },
        getElementById: (id) => elements.get(id),
      };
      globalThis.window = new EventTarget();
      subtest.after(() => {
        delete globalThis.document;
        delete globalThis.window;
      });
      await import(new URL(`../public/js/app.js?form-test=${lang}`, import.meta.url));

      const submit = new Event('submit', { cancelable: true });
      assert.equal(elements.get('auditForm').dispatchEvent(submit), false);
      assert.equal(submit.defaultPrevented, true);
      const form = html.match(/<form id="auditForm"[^>]*>[\s\S]*?<\/form>/)?.[0];
      assert.ok(form);
      assert.doesNotMatch(form, /\s(?:onsubmit|action|name)\s*=/i);
      assert.match(form, /<button type="button" id="findBtn"/);
      assert.ok(html.includes("form-action 'none'"));
    });
  }
});

test('package.json contract', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.type, 'module');
  assert.ok(Number(pkg.engines.node.replace(/^>=/, '')) >= 24);
  assert.deepEqual(pkg.dependencies ?? {}, {});
  for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
    assert.equal(typeof pkg.scripts[script], 'string');
  }
});
