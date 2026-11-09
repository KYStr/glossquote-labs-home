import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../public/js/session.mjs';
import { renderBatch } from '../public/js/core/render.mjs';

function harness(extra = {}) {
  const created = [];
  const revoked = [];
  const changes = [];
  const session = createSession({
    createUrl: blob => { created.push(blob); return `blob:fake-${created.length}`; },
    revokeUrl: url => revoked.push(url),
    makeBlob: (bytes, type) => ({ bytes, type }),
    onChange: state => changes.push(state.phase), ...extra,
  });
  const load = (text = 'Name,ID\nA,001\nB,002') => session.acceptSource(new TextEncoder().encode(text), session.beginSource('fake.csv'));
  return { session, created, revoked, changes, load };
}

test('session generates real export bytes and publishes both URLs only after cap checks', async () => {
  const h = harness();
  h.load(); h.session.setTemplate('Hello {{Name}} / {{ID}}');
  assert.equal(h.session.getState().phase, 'ready');
  assert.equal(await h.session.generate(), true);
  const state = h.session.getState();
  assert.deepEqual(state.result.records.map(record => record.text), ['Hello A / 001', 'Hello B / 002']);
  assert.deepEqual(state.urls, { txt: 'blob:fake-1', json: 'blob:fake-2' });
  assert.equal(new TextDecoder().decode(h.created[0].bytes), '--- 第 1 筆 ---\nHello A / 001\n\n--- 第 2 筆 ---\nHello B / 002\n');
  assert.equal(JSON.parse(new TextDecoder().decode(h.created[1].bytes)).counts.records, 2);
});
test('source, template and blank option mutations synchronously revoke all previous output', async () => {
  for (const mutate of [s => s.setTemplate('{{ID}}'), s => s.setAllowBlank(true), s => s.beginSource('replacement.csv')]) {
    const h = harness(); h.load(); h.session.setTemplate('{{Name}}'); await h.session.generate();
    mutate(h.session);
    assert.equal(h.session.getState().result, null);
    assert.equal(h.session.getState().urls, null);
    assert.equal(h.session.getState().stale, true);
    assert.deepEqual(h.revoked, ['blob:fake-1', 'blob:fake-2']);
  }
});
test('A20 session race: old work ignores abort yet cannot restore output', async () => {
  let finish;
  const h = harness({ render: () => new Promise(resolve => { finish = resolve; }) });
  h.load(); h.session.setTemplate('{{Name}}');
  const pending = h.session.generate();
  assert.equal(h.session.getState().phase, 'generating');
  h.session.setTemplate('{{ID}}');
  finish({ records: [{ row: 1, text: 'STALE', blankFields: [] }], recordTextBytes: 5 });
  assert.equal(await pending, false);
  assert.equal(h.session.getState().result, null);
  assert.equal(h.created.length, 0);
});
test('A20 newest generation wins when an older promise finishes later', async () => {
  const deferred = [];
  const h = harness({ render: () => new Promise(resolve => deferred.push(resolve)) });
  h.load(); h.session.setTemplate('{{Name}}');
  const old = h.session.generate();
  h.session.setTemplate('{{ID}}');
  const current = h.session.generate();
  deferred[1]({ records: [{ row: 1, text: 'CURRENT', blankFields: [] }] });
  assert.equal(await current, true);
  deferred[0]({ records: [{ row: 1, text: 'STALE', blankFields: [] }] });
  assert.equal(await old, false);
  assert.equal(h.session.getState().result.records[0].text, 'CURRENT');
  assert.equal(h.created.length, 2);
});
test('cancel a real yielding renderer; all partial data discarded and retry available', async () => {
  let session;
  const h = harness({ render: (rows, compiled, options) => renderBatch(rows, compiled, { ...options, yieldControl: async () => session.cancel() }) });
  session = h.session;
  h.load(`Name\n${Array(201).fill('A').join('\n')}`); session.setTemplate('{{Name}}');
  assert.equal(await session.generate(), false);
  assert.equal(session.getState().error.code, 'CANCELLED');
  assert.equal(session.getState().result, null);
  assert.equal(session.getState().valid, true);
  assert.equal(h.created.length, 0);
});
test('invalid input, unknown markers and missing values cannot reuse prior successful output', async () => {
  const h = harness(); h.load(); h.session.setTemplate('{{Name}}'); await h.session.generate();
  h.load('Name,ID\nX');
  assert.equal(h.session.getState().error.code, 'ROW_WIDTH');
  assert.equal(await h.session.generate(), false);
  h.load(); h.session.setTemplate('{{address}} {{email}}');
  assert.deepEqual(h.session.getState().error.details.fields, ['address', 'email']);
  assert.equal(await h.session.generate(), false);
  h.load('Name,ID\nA,'); h.session.setTemplate('{{ID}}');
  assert.equal(h.session.getState().error.code, 'MISSING_VALUES');
  assert.equal(h.session.getState().result, null);
  h.session.setAllowBlank(true);
  assert.equal(await h.session.generate(), true);
  assert.deepEqual(h.session.getState().result.records, [{ row: 1, text: '', blankFields: ['ID'] }]);
});
test('A19 cap failure retains neither an old export nor partial new Blob', async () => {
  const h = harness(); h.load('x\nshort'); h.session.setTemplate('{{x}}'); await h.session.generate();
  // Source remains below its own 1 MiB cap; repeated fields create >8 MiB exports.
  h.load(`x\n${'a'.repeat(1_000_000)}`); h.session.setTemplate('{{x}}{{x}}{{x}}{{x}}{{x}}');
  assert.equal(await h.session.generate(), false);
  assert.equal(h.session.getState().error.code, 'OUTPUT_TOO_LARGE');
  assert.equal(h.session.getState().urls, null);
  assert.equal(h.created.length, 2);
  assert.deepEqual(h.revoked, ['blob:fake-1', 'blob:fake-2']);
});
test('large repeated cell is rejected before joining a multi-gigabyte record', async () => {
  const h = harness(); h.load(`x\n${'a'.repeat(1_000_000)}`);
  h.session.setTemplate('{{x}}'.repeat(6000));
  assert.equal(await h.session.generate(), false);
  assert.equal(h.session.getState().error.code, 'OUTPUT_TOO_LARGE');
  assert.equal(h.created.length, 0);
});
test('reset/dispose releases source, compiled, records and URLs; late file read cannot return', async () => {
  const h = harness(); h.load(); h.session.setTemplate('{{Name}}'); await h.session.generate();
  h.session.dispose();
  const cleared = h.session.getState();
  assert.equal(cleared.phase, 'idle');
  for (const key of ['source', 'compiled', 'result', 'urls']) assert.equal(cleared[key], null);
  assert.equal(cleared.template, ''); assert.equal(cleared.allowBlank, false);
  assert.deepEqual(h.revoked, ['blob:fake-1', 'blob:fake-2']);
  const oldToken = h.session.beginSource('late.csv'); h.session.reset();
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name\nA'), oldToken), false);
  assert.equal(h.session.getState().source, null);
});
test('new file read displaces old read; cancellation rejects late bytes', () => {
  const h = harness();
  const first = h.session.beginSource('one.csv'); const second = h.session.beginSource('two.csv');
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name\nOLD'), first), false);
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name\nCURRENT'), second), true);
  assert.deepEqual(h.session.getState().source.rows, [['CURRENT']]);
  const cancelled = h.session.beginSource('three.csv'); h.session.cancel();
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name\nLATE'), cancelled), false);
});
test('URL creation failure revokes the first temporary URL and reports no output', async () => {
  let count = 0;
  const h = harness({ createUrl: () => { if (++count === 2) throw new Error('PRIVATE_EXCEPTION'); return 'blob:temporary'; } });
  h.load(); h.session.setTemplate('{{Name}}');
  assert.equal(await h.session.generate(), false);
  assert.equal(h.session.getState().result, null);
  assert.deepEqual(h.revoked, ['blob:temporary']);
  assert.ok(!JSON.stringify(h.session.getState().error).includes('PRIVATE_EXCEPTION'));
});

test('R01: acceptSource returns false for CSV failures and true for valid CSV with template errors', () => {
  const h = harness();
  const bad = h.session.beginSource('bad.csv');
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name,ID\nA'), bad), false);
  assert.equal(h.session.getState().source, null);
  assert.equal(h.session.getState().error.code, 'ROW_WIDTH');
  h.session.setTemplate('{{Unknown}}');
  const validCsv = h.session.beginSource('valid.csv');
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name\nA'), validCsv), true);
  assert.deepEqual(h.session.getState().source.rows, [['A']]);
  assert.equal(h.session.getState().error.code, 'UNKNOWN_FIELD');
});
test('R01: source token may settle only once; a later rejection cannot corrupt the committed source', () => {
  const h = harness();
  const token = h.session.beginSource('valid.csv');
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name\nA'), token), true);
  h.session.rejectSource('CSV_SYNTAX', token);
  assert.equal(h.session.getState().error, null);
  assert.deepEqual(h.session.getState().source.rows, [['A']]);
  assert.equal(h.session.acceptSource(new TextEncoder().encode('Name\nB'), token), false);
});
