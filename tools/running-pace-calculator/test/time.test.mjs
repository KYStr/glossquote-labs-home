// Time grammar, rounding and formatting.
// Expectations are derived from SPEC section 4 and section 6 by hand,
// not from the implementation.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatTime,
  parseTimeText,
  roundHalfAwayFromZero,
} from '../public/js/core/time.mjs';

test('grammar accepts digits-only total seconds', () => {
  assert.deepEqual(parseTimeText('3300'), { ok: true, seconds: 3300 });
  assert.deepEqual(parseTimeText('0'), { ok: true, seconds: 0 });
  assert.deepEqual(parseTimeText('1'), { ok: true, seconds: 1 });
});

test('grammar accepts M:SS with two-digit seconds 00-59', () => {
  assert.deepEqual(parseTimeText('5:30'), { ok: true, seconds: 330 });
  assert.deepEqual(parseTimeText('55:00'), { ok: true, seconds: 3300 });
  assert.deepEqual(parseTimeText('0:30'), { ok: true, seconds: 30 });
  assert.deepEqual(parseTimeText('120:00'), { ok: true, seconds: 7200 });
});

test('grammar accepts H:MM:SS with two-digit components 00-59', () => {
  assert.deepEqual(parseTimeText('1:45:29'), { ok: true, seconds: 6329 });
  assert.deepEqual(parseTimeText('99:59:59'), { ok: true, seconds: 359999 });
  assert.deepEqual(parseTimeText('3:30:00'), { ok: true, seconds: 12600 });
});

test('grammar trims ASCII whitespace at the edges', () => {
  assert.deepEqual(parseTimeText('  55:00\t'), { ok: true, seconds: 3300 });
});

test('grammar refuses malformed shapes', () => {
  const malformed = [
    '5:3', // one-digit seconds after a colon
    '5min', // words
    '5.5', // decimal point
    '-30', // sign
    '+30', // sign
    '1:2:03', // one-digit middle component
    '12:345', // three-digit seconds
    'abc',
    '1:45:29:00', // four components
    '5:30:5', // one-digit last component
    ':30',
    '30:',
    '5 :30', // inner space
  ];
  for (const text of malformed) {
    const result = parseTimeText(text);
    assert.equal(result.ok, false, text);
    assert.equal(result.code, 'malformed', text);
  }
  assert.deepEqual(parseTimeText(''), { ok: false, code: 'empty' });
  assert.deepEqual(parseTimeText('   '), { ok: false, code: 'empty' });
});

test('grammar names a component above 59', () => {
  assert.deepEqual(parseTimeText('45:90'), {
    ok: false,
    code: 'component',
    component: '90',
  });
  assert.deepEqual(parseTimeText('1:60:00'), {
    ok: false,
    code: 'component',
    component: '60',
  });
  assert.deepEqual(parseTimeText('0:60'), {
    ok: false,
    code: 'component',
    component: '60',
  });
  assert.deepEqual(parseTimeText('1:00:60'), {
    ok: false,
    code: 'component',
    component: '60',
  });
});

test('rounding is half away from zero', () => {
  assert.equal(roundHalfAwayFromZero(2.5), 3);
  assert.equal(roundHalfAwayFromZero(271.5), 272);
  assert.equal(roundHalfAwayFromZero(1295.01), 1295);
  assert.equal(roundHalfAwayFromZero(12420.54), 12421);
  assert.equal(roundHalfAwayFromZero(0.49), 0);
});

test('display format: M:SS under one hour, H:MM:SS at or above', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(30), '0:30');
  assert.equal(formatTime(330), '5:30');
  assert.equal(formatTime(3599), '59:59');
  assert.equal(formatTime(3600), '1:00:00');
  assert.equal(formatTime(359999), '99:59:59');
});

test('display rounds to whole seconds first', () => {
  assert.equal(formatTime(6329.25), '1:45:29'); // SPEC fixture B
  assert.equal(formatTime(531.08352), '8:51'); // SPEC fixture A per mile
  assert.equal(formatTime(90.5), '1:31'); // 91 s, half away from zero
});
