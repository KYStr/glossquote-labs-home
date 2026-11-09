import test from 'node:test';
import assert from 'node:assert/strict';
import { createListState, RESULT_KEYS } from '../public/js/state.mjs';
import { mountApp } from '../public/js/app.mjs';
import { renderRows } from '../public/js/render.mjs';
import { WORDING } from '../public/js/wording.mjs';
import { fixtureDocument, deferred } from './dom-fixture.mjs';

function ready(options) {
  const state = createListState(options);
  state.setInput('aText', 'Ada\nBo\nAda'); state.setInput('bText', 'Bo\nCy'); state.compare();
  return state;
}

test('A31 renderer treats HTML-like items as text nodes only', () => {
  const { document, get } = fixtureDocument();
  const text = '<img onerror=alert(1)>';
  renderRows(document, get('aOnly-rows'), [{ text, source: 'A', firstLine: 1, occurrences: 1 }], 'aOnly', WORDING.en);
  assert.deepEqual(document.createdTags, ['li', 'span', 'small']);
  assert.equal(get('aOnly-rows').children[0].children[0].textContent, text);
});
test('A34 clear resets both inputs, defaults, result, errors and copy fallback', async () => {
  const state = ready();
  await state.copy('merged');
  assert.equal(state.snapshot().copies.merged.status, 'fallback');
  state.setOption('trimItems', false); state.setOption('ignoreCase', true); state.compare(); await state.copy('merged'); state.clear();
  const after = state.snapshot();
  assert.deepEqual(after.request, { aText: '', bText: '', trimItems: true, ignoreCase: false });
  assert.equal(after.value, null); assert.equal(after.error, null); assert.deepEqual(after.copies, {});
});
test('A35 input/change event on either side invalidates results synchronously', () => {
  for (const id of ['a-text', 'b-text']) for (const event of ['input', 'change']) {
    const { document, window, get } = fixtureDocument(); const state = mountApp(document, window);
    state.loadExample(); state.compare(); const revision = state.snapshot().revision;
    get(id).value += 'X'; get(id).fire(event);
    assert.equal(state.snapshot().revision, revision + 1); assert.equal(state.snapshot().value, null);
    for (const section of RESULT_KEYS) { assert.equal(get(`${section}-copy`).disabled, true); assert.equal(get(`${section}-rows`).children.length, 0); }
  }
});
test('A36 either option event clears results immediately', () => {
  for (const id of ['trim-items', 'ignore-case']) for (const event of ['input', 'change']) {
    const { document, window, get } = fixtureDocument(); const state = mountApp(document, window); state.loadExample(); state.compare();
    get(id).checked = !get(id).checked; get(id).fire(event);
    assert.equal(state.snapshot().value, null); assert.equal(get('merged-copy').disabled, true);
  }
});
test('A37 invalidated copy and empty result never write old or empty text', async () => {
  const writes = []; const state = ready({ writeClipboard: text => writes.push(text) });
  state.setInput('aText', 'Edited');
  assert.equal(await state.copy('merged'), false); assert.deepEqual(writes, []);
  state.clear(); state.compare();
  for (const section of RESULT_KEYS) assert.equal(await state.copy(section), false);
  assert.deepEqual(writes, []);
});
test('A38 edited revision ignores old pending resolve and reject', async () => {
  for (const settlement of ['resolve', 'reject']) {
    const pending = deferred(); const state = ready({ writeClipboard: () => pending.promise });
    const operation = state.copy('merged'); state.setInput('aText', 'Edited'); pending[settlement]();
    assert.equal(await operation, false); assert.deepEqual(state.snapshot().copies, {}); assert.equal(state.snapshot().value, null);
  }
});
test('A39 same revision reverse settlements accept only the latest request', async () => {
  const first = deferred(); const second = deferred(); let calls = 0;
  const state = ready({ writeClipboard: () => (++calls === 1 ? first.promise : second.promise) });
  const revision = state.snapshot().revision;
  const old = state.copy('aOnly'); const latest = state.copy('merged');
  second.resolve(); assert.equal(await latest, true); first.reject(); assert.equal(await old, false);
  assert.equal(state.snapshot().revision, revision);
  assert.deepEqual(state.snapshot().copies, { merged: { status: 'success', text: '' } });
  const p1 = deferred(); const p2 = deferred(); let index = 0;
  const repeat = ready({ writeClipboard: () => (++index === 1 ? p1.promise : p2.promise) });
  const earlier = repeat.copy('aOnly'); const newer = repeat.copy('aOnly'); p2.reject(); await newer; p1.resolve(); await earlier;
  assert.deepEqual(repeat.snapshot().copies, { aOnly: { status: 'fallback', text: 'Ada' } });
});
test('A40 missing/rejected/synchronous clipboard failure shows selectable read-only text', async () => {
  for (const clipboard of [undefined, { writeText: () => Promise.reject(new Error('Fake raw exception')) }, { writeText() { throw new Error('Fake raw exception'); } }]) {
    const { document, window, get } = fixtureDocument(); window.navigator.clipboard = clipboard;
    const state = mountApp(document, window); state.loadExample(); state.compare(); await state.copy('merged');
    assert.equal(get('merged-fallback').hidden, false); assert.equal(get('merged-manual').value, 'Ada\nBo\nbo\nCy');
    assert.equal(get('merged-copy-status').textContent.includes('Fake raw exception'), false);
    assert.match(WORDING.en.fallback, /Select the read-only text/);
  }
});
test('A41 each result copies every item using LF, no trailing LF, no viewport truncation', async () => {
  const writes = []; const state = ready({ writeClipboard: text => writes.push(text) });
  for (const section of RESULT_KEYS) await state.copy(section);
  assert.deepEqual(writes, ['Ada', 'Cy', 'Bo', 'Ada\nBo\nCy']);
  const long = Array.from({ length: 500 }, (_, i) => `Fake_${i}`).join('\n');
  state.setInput('aText', long); state.setInput('bText', 'Fake_499\nB-only'); state.compare(); await state.copy('merged');
  assert.equal(writes.at(-1), long + '\nB-only'); assert.equal(writes.at(-1).endsWith('\n'), false);
});
test('A42 pagehide clears DOM inputs/options/results/fallback/messages and pending identity', async () => {
  const pending = deferred(); const { document, window, get } = fixtureDocument(); window.navigator.clipboard = { writeText: () => pending.promise };
  const state = mountApp(document, window); state.loadExample(); state.setOption('ignoreCase', true); state.compare();
  const operation = state.copy('merged'); window.fire('pagehide');
  pending.resolve(); assert.equal(await operation, false);
  assert.equal(get('a-text').value, ''); assert.equal(get('b-text').value, ''); assert.equal(get('trim-items').checked, true); assert.equal(get('ignore-case').checked, false);
  assert.equal(get('comparison-status').textContent, ''); assert.equal(get('error-notice').textContent, '');
  for (const section of RESULT_KEYS) {
    assert.equal(get(`${section}-copy`).disabled, true); assert.equal(get(`${section}-rows`).children.length, 0);
    assert.equal(get(`${section}-manual`).value, ''); assert.equal(get(`${section}-fallback`).hidden, true); assert.equal(get(`${section}-copy-status`).textContent, '');
  }
});
test('A43 mounting a fresh session discards restored form values; bfcache pageshow also resets', () => {
  const { document, window, get } = fixtureDocument(); get('a-text').value = 'Fake restored draft'; get('ignore-case').checked = true;
  const state = mountApp(document, window); assert.equal(get('a-text').value, ''); assert.equal(get('ignore-case').checked, false);
  state.loadExample(); state.compare(); window.fire('pageshow', { persisted: true }); assert.equal(get('a-text').value, ''); assert.equal(state.snapshot().value, null);
});
test('Submission failure focuses its side, clears earlier results and retains full raw draft', () => {
  const { document, window, get } = fixtureDocument('zh-Hant'); mountApp(document, window);
  get('example').fire('click'); get('compare-form').fire('submit');
  const raw = 'Fake_' + 'X'.repeat(100001); get('b-text').value = raw; get('b-text').fire('input'); get('compare-form').fire('submit');
  assert.equal(document.activeElement, get('b-text')); assert.equal(get('b-text').value, raw);
  assert.equal(get('b-text').attributes['aria-invalid'], 'true'); assert.equal(get('merged-rows').children.length, 0); assert.equal(get('merged-copy').disabled, true);
});
test('Recompare and clear ignore pending callbacks even without an edit', async () => {
  for (const next of ['compare', 'clear']) {
    const pending = deferred(); const state = ready({ writeClipboard: () => pending.promise });
    const operation = state.copy('merged'); state[next](); pending.resolve(); assert.equal(await operation, false); assert.deepEqual(state.snapshot().copies, {});
  }
});
test('Both languages expose successful empty sets without an error', () => {
  for (const language of ['zh-Hant', 'en']) {
    const { document, window, get } = fixtureDocument(language); const state = mountApp(document, window); state.compare();
    assert.equal(get('error-notice').hidden, true); assert.notEqual(get('comparison-status').textContent, '');
    for (const section of RESULT_KEYS) assert.equal(get(`${section}-empty`).textContent, WORDING[language].empty);
  }
});
