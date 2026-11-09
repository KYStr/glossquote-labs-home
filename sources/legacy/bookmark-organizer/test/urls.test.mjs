import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHref } from '../public/js/core/urls.js';
import { parseInput } from '../public/js/core/parser.js';
import { bytes, firefox } from './fixtures.mjs';
test('K49-13–15: scheme, credentials and invalid URL table', () => {
  for (const [input, code] of [['javascript:alert(1)', 'UNSAFE_URL'], ['data:text/html,x', 'UNSAFE_URL'], ['file:///x', 'UNSAFE_URL'], ['https://user:pass@example.com/', 'UNSAFE_URL'], ['/docs', 'INVALID_URL'], [' https://example.com/a', 'INVALID_URL'], ['https://example.com/a ', 'INVALID_URL'], ['nonsense', 'INVALID_URL'], ['https://example.com/%zz', 'INVALID_URL'], ['https://example.com/a\u0085b', 'INVALID_URL']]) {
    assert.throws(() => validateHref(input), error => error.code === code, input);
  }
  for (const href of ['https://EXAMPLE.com', 'https://example.com/', 'https://example.com/#x', 'https://example.com/%41', 'HTTPS://example.com/a', 'https://例子.example/a']) assert.equal(validateHref(href), href);
});
test('K49-30: network/open spies remain at zero for input URLs and ignored icons', () => {
  let calls = 0;
  const oldFetch = globalThis.fetch;
  const oldOpen = globalThis.open;
  globalThis.fetch = () => { calls++; throw new Error('Network forbidden'); };
  globalThis.open = () => { calls++; throw new Error('Open forbidden'); };
  try { assert.equal(parseInput(bytes(firefox)).status, 'ready'); assert.equal(calls, 0); }
  finally { globalThis.fetch = oldFetch; if (oldOpen === undefined) delete globalThis.open; else globalThis.open = oldOpen; }
});
