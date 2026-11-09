import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppFixture, flushCallbacks } from './app-fixture.mjs';
import { messages } from '../public/js/i18n.mjs';

for (const language of ['zh-Hant', 'en']) {
  for (const oldOutcome of ['resolve', 'reject']) {
    for (const newOutcome of ['resolve', 'reject']) {
      test(`R1 actual app integration ${language}: old ${oldOutcome} cannot settle replacement while new ${newOutcome} is pending`, async t => {
        const fixture = await loadAppFixture(language);
        t.after(() => fixture.close());
        fixture.input('source', 'OLD!');
        fixture.input('limit', '2');
        fixture.split();
        fixture.copy(1);
        assert.equal(fixture.requests[0].text, 'OL');
        assert.equal(fixture.observe().busy, 'true');
        fixture.lifecycle('pagehide');
        assert.equal(fixture.element('source').value, '');
        assert.equal(fixture.chunks().length, 0);
        fixture.lifecycle('pageshow');
        assert.equal(fixture.element('source').value, '');
        assert.equal(fixture.element('limit').value, '280');

        // Same number/order of input, calculate and copy calls as the old instance.
        fixture.input('source', 'NEW!');
        fixture.input('limit', '2');
        fixture.split();
        fixture.copy(1);
        assert.equal(fixture.requests[1].text, 'NE');
        assert.deepEqual(fixture.observe().chunks, ['NE', 'W!']);
        const pending = fixture.observe();
        assert.equal(pending.status, `• ${messages[language].busy('1')}`);
        assert.equal(pending.editorLocks.every(([, disabled]) => disabled), true);
        assert.equal(pending.copyLocks.every(Boolean), true);

        fixture.requests[0][oldOutcome](oldOutcome === 'reject' ? new Error('FAKE_OLD_REJECTION') : undefined);
        await flushCallbacks();
        // Runs the real production settled callback, not a recreated guard.
        assert.deepEqual(fixture.observe(), pending, 'Old callback changed new text, busy state, notice, focus or selection');
        fixture.copyButtons()[1].emit('click');
        assert.equal(fixture.requests.length, 2, 'New copy is still single-flight');

        fixture.requests[1][newOutcome](newOutcome === 'reject' ? new Error('FAKE_NEW_REJECTION') : undefined);
        await flushCallbacks();
        const settled = fixture.observe();
        assert.equal(settled.busy, 'false');
        assert.equal(settled.editorLocks.every(([, disabled]) => !disabled), true);
        assert.equal(settled.copyLocks.every(disabled => !disabled), true);
        assert.deepEqual(settled.chunks, ['NE', 'W!']);
        if (newOutcome === 'resolve') {
          assert.equal(settled.status, `✓ ${messages[language].copied('1')}`);
          assert.equal(settled.selectionCalls, pending.selectionCalls);
          assert.equal(settled.focusCalls, pending.focusCalls);
        } else {
          assert.equal(settled.status, `• ${messages[language].fallback('1')}`);
          assert.equal(settled.focused, 'chunk-1');
          assert.equal(settled.kind, 'info');
          assert.equal(fixture.element('chunk-1').selectionStart, 0);
          assert.equal(fixture.element('chunk-1').selectionEnd, 2);
        }
      });
    }
  }
}

test('R1 actual app integration: both late outcomes leave an empty replacement idle', async t => {
  const fixture = await loadAppFixture('en');
  t.after(() => fixture.close());
  for (const outcome of ['resolve', 'reject']) {
    fixture.input('source', 'OLD!');
    fixture.input('limit', '2');
    fixture.split();
    fixture.copy(1);
    const request = fixture.requests.at(-1);
    fixture.lifecycle('pagehide');
    fixture.lifecycle('pageshow');
    const idle = fixture.observe();
    request[outcome](outcome === 'reject' ? new Error('FAKE_LATE_REJECTION') : undefined);
    await flushCallbacks();
    assert.deepEqual(fixture.observe(), idle);
  }
});
