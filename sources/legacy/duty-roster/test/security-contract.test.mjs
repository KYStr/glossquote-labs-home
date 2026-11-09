import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { check, root } from '../scripts/check.mjs';
import path from 'node:path';
import { calculateRoster } from '../public/js/core/roster.js';

test('T00: real source/security check and fail-closed initial controls', async () => {
  assert.equal((await check()).includes('js/core/roster.js'), true);
  for (const filename of ['public/index.html', 'public/en/index.html']) {
    const html = await readFile(path.join(root, filename), 'utf8');
    for (const match of html.matchAll(/<(?:input|button|textarea|select)\b[^>]*>/g)) assert.match(match[0], /\bdisabled\b/);
    assert.doesNotMatch(html, /<input\b[^>]*\bname=|<form\b[^>]*\baction=/);
  }
});

const input = () => ({ startRaw: '2026-10-19', endRaw: '2026-10-19', weekdays: [1], people: [{ id: 'a', nameRaw: 'FAKE-CANARY', weekdays: [1] }] });
const failure = (code, path) => ({ ok: false, error: { code, path } });
test('schema: inherited, null and custom prototypes rejected', () => {
  for (const root of [null, [], Object.create(null), Object.create(input())]) assert.deepEqual(calculateRoster(root), failure('REQUEST_SCHEMA', '/'));
  class Custom extends Array {}
  assert.deepEqual(calculateRoster({ ...input(), weekdays: new Custom(1) }), failure('WEEKDAYS_SCHEMA', '/weekdays'));
});
test('schema: non-enumerable/accessor array indices, symbols and noncanonical properties', () => {
  for (const target of ['weekdays', 'people', 'personWeekdays']) {
    for (const mode of ['accessor', 'hidden', 'symbol', 'noncanonical']) {
      const request = input(); let calls = 0;
      const array = target === 'personWeekdays' ? request.people[0].weekdays : request[target];
      if (mode === 'accessor') Object.defineProperty(array, '0', { enumerable: true, get() { calls++; return 1; } });
      if (mode === 'hidden') Object.defineProperty(array, '0', { value: 1, enumerable: false });
      if (mode === 'symbol') array[Symbol('x')] = 1;
      if (mode === 'noncanonical') array['01'] = 1;
      const [code, pointer] = target === 'personWeekdays' ? ['PERSON_WEEKDAYS_SCHEMA', '/people/0/weekdays'] : target === 'people' ? ['PEOPLE_SCHEMA', '/people'] : ['WEEKDAYS_SCHEMA', '/weekdays'];
      assert.deepEqual(calculateRoster(request), failure(code, pointer)); assert.equal(calls, 0);
    }
  }
});
test('schema: person accessor/hidden required property is never read', () => {
  const request = input(); let calls = 0;
  Object.defineProperty(request.people[0], 'nameRaw', { enumerable: true, get() { calls++; return 'FAKE-CANARY'; } });
  assert.deepEqual(calculateRoster(request), failure('PERSON_SCHEMA', '/people/0')); assert.equal(calls, 0);
  Object.defineProperty(request, 'startRaw', { enumerable: false, value: '2026-10-19' });
  assert.deepEqual(calculateRoster(request), failure('REQUEST_SCHEMA', '/'));
});
test('schema: reflection exceptions fail closed without raw values', () => {
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  assert.deepEqual(calculateRoster(revoked.proxy), failure('REQUEST_SCHEMA', '/'));
  const request = input(); request.weekdays = new Proxy([1], { ownKeys() { throw Error('FAKE-CANARY'); } });
  assert.deepEqual(calculateRoster(request), failure('WEEKDAYS_SCHEMA', '/weekdays'));
});
test('schema: name errors and all generated failures omit input content', () => {
  const request = input(); request.people[0].nameRaw += '\nFAKE-CANARY';
  const actual = calculateRoster(request);
  assert.deepEqual(actual, failure('PERSON_NAME_CONTROL', '/people/0/nameRaw'));
  assert.equal(JSON.stringify(actual).includes('FAKE-CANARY'), false);
});
