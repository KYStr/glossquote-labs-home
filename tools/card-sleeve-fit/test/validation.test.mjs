// Validation boundaries for Card Sleeve Stock Fit (SPEC inputsOutputs).
// Expected codes/paths are derived from the SPEC's own rules, never from
// the implementation's output.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solve, validate, parseTenths, parseIntField, formatTenths, normalizeName,
} from '../public/js/core/solve.mjs';

function base(overrides = {}) {
  return {
    minGap: 0,
    maxGap: 20,
    cards: [{ name: 'A', w: 635, h: 880, qty: 1 }],
    sleeves: [{ name: 'S', w: 640, h: 890, stock: 1 }],
    ...overrides,
  };
}
function expectError(input, code, path) {
  assert.deepStrictEqual(validate(input), { code, path });
  assert.deepStrictEqual(solve(input), { status: 'error', error: { code, path } });
}

// --- SIZE: JSON UTF-8 cap 65536 bytes, SIZE fires before field errors ------
test('SIZE: oversized document reports SIZE at root before any field error', () => {
  // A maximal realistic document (8+8 rows, 24-char names) stays far under
  // the cap, so the cap is only reachable with a field that is itself
  // oversized; SIZE must still fire first.
  const doc = base({
    cards: Array.from({ length: 8 }, (_, i) => ({
      name: `C${i}${'x'.repeat(20)}`,
      w: 635, h: 880, qty: 500,
    })),
    sleeves: Array.from({ length: 8 }, (_, i) => ({
      name: `S${i}${'y'.repeat(20)}`,
      w: 640, h: 890, stock: 1000,
    })),
  });
  const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
  assert.ok(bytes < 65536, `maximal realistic doc is ${bytes} bytes, expected well under the cap`);
  const huge = base({ cards: [{ name: 'A'.repeat(70000), w: 635, h: 880, qty: 1 }] });
  const hugeBytes = new TextEncoder().encode(JSON.stringify(huge)).length;
  assert.ok(hugeBytes > 65536, `oversized doc is ${hugeBytes} bytes`);
  expectError(huge, 'SIZE', '');
});

// --- SHAPE: exact key sets -----------------------------------------------
test('SHAPE: unknown root key reports the root path; missing key reports its path', () => {
  const unknown = base();
  unknown.extra = 1;
  expectError(unknown, 'SHAPE', '');
  const { maxGap, ...missing } = base();
  expectError(missing, 'SHAPE', '/maxGap');
  const rowUnknown = base({ cards: [{ name: 'A', w: 635, h: 880, qty: 1, z: 0 }] });
  expectError(rowUnknown, 'SHAPE', '/cards/0');
  const rowMissing = base({ sleeves: [{ name: 'S', w: 640, h: 890 }] });
  expectError(rowMissing, 'SHAPE', '/sleeves/0/stock');
});

// --- TYPE: non-objects, string numbers, floats, -0, unsafe integers ------
test('TYPE: non-object inputs, string numbers, floats, -0, booleans', () => {
  for (const bad of [null, [], 'x', 42, true]) {
    expectError(bad, 'TYPE', '');
  }
  expectError(base({ minGap: '0' }), 'TYPE', '/minGap');
  expectError(base({ minGap: 0.5 }), 'TYPE', '/minGap');
  expectError(base({ minGap: -0 }), 'TYPE', '/minGap');
  expectError(base({ minGap: Number.MAX_SAFE_INTEGER + 1 }), 'TYPE', '/minGap');
  expectError(base({ cards: 'nope' }), 'TYPE', '/cards');
  expectError(base({ cards: [null] }), 'TYPE', '/cards/0');
  expectError(base({ cards: [{ name: 7, w: 635, h: 880, qty: 1 }] }), 'TYPE', '/cards/0/name');
  expectError(base({ sleeves: [{ name: 'S', w: 640, h: 890, stock: true }] }), 'TYPE', '/sleeves/0/stock');
});

// --- RANGE: inclusive bounds, one past each end ---------------------------
test('RANGE: each integer field accepts its endpoints and rejects one past', () => {
  expectError(base({ minGap: -1 }), 'RANGE', '/minGap');
  expectError(base({ minGap: 101 }), 'RANGE', '/minGap');
  assert.equal(validate(base({ minGap: 0, maxGap: 100 })), null);
  expectError(base({ cards: [{ name: 'A', w: 9, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/w');
  expectError(base({ cards: [{ name: 'A', w: 3001, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/w');
  expectError(base({ cards: [{ name: 'A', w: 635, h: 3001, qty: 1 }] }), 'RANGE', '/cards/0/h');
  assert.equal(validate(base({ cards: [{ name: 'A', w: 10, h: 3000, qty: 1 }] })), null);
  expectError(base({ cards: [{ name: 'A', w: 635, h: 880, qty: 0 }] }), 'RANGE', '/cards/0/qty');
  expectError(base({ cards: [{ name: 'A', w: 635, h: 880, qty: 501 }] }), 'RANGE', '/cards/0/qty');
  expectError(base({ sleeves: [{ name: 'S', w: 640, h: 890, stock: -1 }] }), 'RANGE', '/sleeves/0/stock');
  expectError(base({ sleeves: [{ name: 'S', w: 640, h: 890, stock: 1001 }] }), 'RANGE', '/sleeves/0/stock');
  assert.equal(validate(base({ sleeves: [{ name: 'S', w: 640, h: 890, stock: 0 }] })), null);
});

test('RANGE: card/sleeve arrays need 1-8 rows', () => {
  expectError(base({ cards: [] }), 'RANGE', '/cards');
  expectError(base({ sleeves: [] }), 'RANGE', '/sleeves');
  const nine = Array.from({ length: 9 }, (_, i) => ({ name: `C${i}`, w: 635, h: 880, qty: 1 }));
  expectError(base({ cards: nine }), 'RANGE', '/cards');
  const eight = Array.from({ length: 8 }, (_, i) => ({ name: `C${i}`, w: 635, h: 880, qty: 1 }));
  assert.equal(validate(base({ cards: eight })), null);
});

// --- names: NFC, trimming, code-point length, character rules -------------
test('names: U+0020 trimming + NFC make equivalents duplicates', () => {
  // 'e' + combining acute (U+0301) normalizes to 'é' (U+00E9); the second
  // name also trims surrounding U+0020, so both normalize to the same name
  // and the duplicate points at row 1.
  const doc = base({
    cards: [
      { name: 'é', w: 635, h: 880, qty: 1 },
      { name: ' é ', w: 635, h: 880, qty: 1 },
    ],
  });
  expectError(doc, 'DUPLICATE', '/cards/1/name');
});

test('names: case-sensitive, so A and a are different names', () => {
  const doc = base({
    cards: [
      { name: 'A', w: 635, h: 880, qty: 1 },
      { name: 'a', w: 635, h: 880, qty: 1 },
    ],
  });
  assert.equal(validate(doc), null);
});

test('names: length is counted in code points, 24 ok, 25 rejected', () => {
  assert.equal(validate(base({ cards: [{ name: 'a'.repeat(24), w: 635, h: 880, qty: 1 }] })), null);
  expectError(base({ cards: [{ name: 'a'.repeat(25), w: 635, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/name');
  // 24 astral letters (48 UTF-16 units) are still 24 code points: valid.
  // U+10400 DESERET CAPITAL LETTER LONG I is a Unicode letter.
  assert.equal(validate(base({ cards: [{ name: '𐐀'.repeat(24), w: 635, h: 880, qty: 1 }] })), null);
  expectError(base({ cards: [{ name: '𐐀'.repeat(25), w: 635, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/name');
});

test('names: first char must be a letter or digit; rest limited set', () => {
  expectError(base({ cards: [{ name: '-A', w: 635, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/name');
  expectError(base({ cards: [{ name: 'A/B', w: 635, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/name');
  expectError(base({ cards: [{ name: 'A　B', w: 635, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/name');
  expectError(base({ cards: [{ name: '   ', w: 635, h: 880, qty: 1 }] }), 'RANGE', '/cards/0/name');
  assert.equal(validate(base({ cards: [{ name: 'A-1_b C', w: 635, h: 880, qty: 1 }] })), null);
  assert.equal(normalizeName('  A B  '), 'A B');
});

test('names: card and sleeve namespaces are separate', () => {
  const doc = base({
    cards: [{ name: 'X', w: 635, h: 880, qty: 1 }],
    sleeves: [{ name: 'X', w: 640, h: 890, stock: 1 }],
  });
  assert.equal(validate(doc), null);
});

// --- field order: first error in table order wins --------------------------
test('field order: minGap is reported before a later bad card field', () => {
  const doc = base({
    minGap: 200,
    cards: [{ name: 'A', w: 5, h: 880, qty: 1 }],
  });
  expectError(doc, 'RANGE', '/minGap');
});

test('DUPLICATE beats ORDER: a duplicate name is reported before gap order', () => {
  const doc = base({
    minGap: 25,
    maxGap: 10,
    sleeves: [
      { name: 'S', w: 640, h: 890, stock: 1 },
      { name: 'S', w: 645, h: 890, stock: 2 },
    ],
  });
  expectError(doc, 'DUPLICATE', '/sleeves/1/name');
});

// --- form helpers -----------------------------------------------------------
test('parseTenths: integer or one decimal only', () => {
  assert.equal(parseTenths('63.5'), 635);
  assert.equal(parseTenths('63'), 630);
  assert.equal(parseTenths('0'), 0);
  assert.equal(parseTenths('0.5'), 5);
  assert.equal(parseTenths('300'), 3000);
  for (const bad of ['', ' ', '63.55', '63.', '.5', '063', '00', '-1', '+63', '1e2', '６３', '63,5', ' 63', '63 ']) {
    assert.equal(parseTenths(bad), null, JSON.stringify(bad));
  }
  assert.equal(parseTenths(63.5), null);
});

test('parseIntField: strict ASCII non-negative integer', () => {
  assert.equal(parseIntField('0'), 0);
  assert.equal(parseIntField('500'), 500);
  for (const bad of ['', '01', '-0', '-1', '1.0', '1e3', '５', ' 7']) {
    assert.equal(parseIntField(bad), null, JSON.stringify(bad));
  }
});

test('formatTenths: plain one-decimal rendering', () => {
  assert.equal(formatTenths(635), '63.5');
  assert.equal(formatTenths(20), '2.0');
  assert.equal(formatTenths(0), '0.0');
  assert.equal(formatTenths(5), '0.5');
  assert.equal(formatTenths(-25), '-2.5');
});
