// Controller state-machine tests (SPEC §2/§7): transitions, clearing,
// reset, language switching, and pagehide semantics — all without a DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession, setField, compare, reset, setLanguage, setGrammarOpen,
  hideResults, INITIAL_LEFT, INITIAL_RIGHT,
} from '../src/assets/controller.mjs';

test('initial state is idle with the documented defaults', () => {
  const s = createSession('zh');
  assert.deepEqual([s.left, s.right, s.phase], [INITIAL_LEFT, INITIAL_RIGHT, 'idle']);
  assert.equal(s.result, null);
  assert.deepEqual(s.errors, []);
  assert.equal(s.grammarOpen, false);
});

test('edit moves to dirty and clears any previous result and errors', () => {
  const s = createSession('zh');
  compare(s);
  assert.equal(s.phase, 'result');
  setField(s, 'left', 'span');
  assert.equal(s.phase, 'dirty');
  assert.equal(s.result, null);
  assert.deepEqual(s.errors, []);
});

test('compare success stores the structured result', () => {
  const s = createSession('en');
  const out = compare(s);
  assert.equal(out.focusField, null);
  assert.equal(s.phase, 'result');
  assert.deepEqual(s.result.left.specificity, [1, 1, 0]);
  assert.deepEqual(s.result.right.specificity, [0, 2, 1]);
});

test('compare failure stores errors and names the first invalid field (L before R)', () => {
  const s = createSession('zh');
  setField(s, 'left', ':foo');
  setField(s, 'right', '.1x');
  const out = compare(s);
  assert.equal(s.phase, 'invalid');
  assert.equal(s.result, null);
  assert.equal(s.errors.length, 2);
  assert.equal(out.focusField, 'left');
  const s2 = createSession('zh');
  setField(s2, 'right', ':foo');
  assert.equal(compare(s2).focusField, 'right');
});

test('identical text still compares into two distinct analyses', () => {
  const s = createSession('zh');
  setField(s, 'left', 'div');
  setField(s, 'right', 'div');
  compare(s);
  assert.equal(s.result.comparison, 'equal');
  assert.notEqual(s.result.left, s.result.right);
});

test('reset restores exact initial strings, clears state, collapses details', () => {
  const s = createSession('zh');
  setField(s, 'left', ':foo');
  compare(s);
  setGrammarOpen(s, true);
  reset(s);
  assert.deepEqual([s.left, s.right], [INITIAL_LEFT, INITIAL_RIGHT]);
  assert.equal(s.phase, 'idle');
  assert.equal(s.result, null);
  assert.deepEqual(s.errors, []);
  assert.equal(s.grammarOpen, false);
});

test('language switch preserves raw text, phase, result, errors, disclosure state', () => {
  const s = createSession('zh');
  setField(s, 'left', ':is(#x)');
  compare(s);
  setGrammarOpen(s, true);
  setLanguage(s, 'en');
  assert.equal(s.lang, 'en');
  assert.equal(s.left, ':is(#x)');
  assert.equal(s.phase, 'result');
  assert.deepEqual(s.result.left.specificity, [1, 0, 0]);
  assert.equal(s.grammarOpen, true);
  const s2 = createSession('zh');
  setField(s2, 'right', ':foo');
  compare(s2);
  setLanguage(s2, 'en');
  assert.equal(s2.phase, 'invalid');
  assert.equal(s2.errors.length, 1);
});

test('pagehide semantics: clear results/errors, keep raw, require new Compare', () => {
  const s = createSession('zh');
  compare(s);
  hideResults(s);
  assert.equal(s.result, null);
  assert.deepEqual(s.errors, []);
  assert.equal(s.phase, 'dirty');
  assert.equal(s.left, INITIAL_LEFT);
});
