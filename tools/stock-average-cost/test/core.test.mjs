// Core tests: SPEC fixtures.json (vendored verbatim from the fixed spec
// candidate 879cad568897c5413f8e556311d5314c7b7e8a1b) plus hand-derived
// boundary and attack cases. Expected values are derived from the SPEC
// rules, never from the implementation's own output.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { run } from '../public/js/core/calculate.mjs';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(
  readFileSync(path.join(toolRoot, 'test/fixtures.json'), 'utf8'),
);

test('vendored fixtures are the fixed spec candidate', () => {
  assert.equal(fixtures.specId, 'spec-stock-average-cost-20261109');
  assert.equal(fixtures.slug, 'stock-average-cost');
  assert.equal(fixtures.cases.filter((c) => c.kind === 'core').length, 10);
  assert.equal(fixtures.cases.filter((c) => c.kind === 'controller').length, 3);
});

test('SPEC core fixtures match run() exactly', () => {
  for (const fixture of fixtures.cases) {
    if (fixture.kind !== 'core') continue;
    assert.deepEqual(run(fixture.input), fixture.expected, `fixture ${fixture.id}`);
  }
});

function err(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function buy(shares, price) {
  return { side: 'buy', shares, price };
}

function sell(shares, price) {
  return { side: 'sell', shares, price };
}

test('SCHEMA: wrong envelope and wrong types', () => {
  const schema = err('SCHEMA', null, null);
  const badInputs = [
    null, undefined, 42, true, 'x', [],
    {},
    { feeRateBps: '0' },
    { trades: [] },
    { feeRateBps: '0', trades: [], extra: 1 },
    { feeRateBps: 0, trades: [buy('1', '1')] },
    { feeRateBps: '0', trades: 'x' },
  ];
  for (const bad of badInputs) {
    assert.deepEqual(run(bad), schema, JSON.stringify(bad));
  }
  // Trade shape errors carry the 1-based row.
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [buy('1', '1'), { side: 'buy', shares: '1' }] }),
    err('SCHEMA', null, 2),
  );
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [null] }),
    err('SCHEMA', null, 1),
    'a non-object trade is a trade-shape error with its row',
  );
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [['buy', '1', '1']] }),
    err('SCHEMA', null, 1),
    'an array trade is a trade-shape error with its row',
  );
  const badTrades = [
    { side: 'buy', shares: '1' },
    { side: 'buy', shares: '1', price: '1', note: 'x' },
    { side: 'buy', shares: 1, price: '1' },
    { side: 'buy', shares: '1', price: 1 },
    { side: 1, shares: '1', price: '1' },
  ];
  for (const badTrade of badTrades) {
    assert.deepEqual(
      run({ feeRateBps: '0', trades: [badTrade] }),
      err('SCHEMA', null, 1),
      JSON.stringify(badTrade),
    );
  }
  // A "__proto__" own key from JSON is an extra field, not pollution.
  const sneaky = JSON.parse('{"side":"buy","shares":"1","price":"1","__proto__":{}}');
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [sneaky] }),
    err('SCHEMA', null, 1),
  );
  assert.equal({}.polluted, undefined);
});

test('SCHEMA: accessors and inherited properties are rejected', () => {
  const schema = err('SCHEMA', null, null);
  const accessor = { trades: [buy('1', '1')] };
  Object.defineProperty(accessor, 'feeRateBps', { get: () => '0', enumerable: true });
  assert.deepEqual(run(accessor), schema, 'accessor feeRateBps');

  const tradeAccessor = buy('1', '1');
  Object.defineProperty(tradeAccessor, 'shares', { get: () => '1', enumerable: true });
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [tradeAccessor] }),
    err('SCHEMA', null, 1),
    'accessor shares',
  );

  const inherited = Object.create({ feeRateBps: '0', trades: [buy('1', '1')] });
  assert.deepEqual(run(inherited), schema, 'inherited envelope');
});

test('shape errors precede fee errors (SPEC step order 0 before 1)', () => {
  assert.deepEqual(
    run({ feeRateBps: '9999', trades: [{ side: 'buy', shares: '1' }] }),
    err('SCHEMA', null, 1),
  );
});

test('fee errors precede row-count errors (SPEC step order 1 before 2)', () => {
  const trades = Array.from({ length: 21 }, () => buy('1', '1'));
  assert.deepEqual(run({ feeRateBps: '1001', trades }), err('RANGE', 'feeRateBps', null));
});

test('feeRateBps validation', () => {
  const one = [buy('1', '1')];
  assert.deepEqual(run({ feeRateBps: '', trades: one }), err('EMPTY', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '12345', trades: one }), err('INPUT_LIMIT', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '10000', trades: one }), err('INPUT_LIMIT', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '\uD800', trades: one }), err('UNICODE', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '01', trades: one }), err('INTEGER_FORMAT', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '1.5', trades: one }), err('INTEGER_FORMAT', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '-1', trades: one }), err('INTEGER_FORMAT', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: ' 1', trades: one }), err('INTEGER_FORMAT', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '１２', trades: one }), err('INTEGER_FORMAT', 'feeRateBps', null));
  assert.deepEqual(run({ feeRateBps: '1001', trades: one }), err('RANGE', 'feeRateBps', null));
  assert.equal(run({ feeRateBps: '1000', trades: one }).ok, true, 'fee 1000 is the valid maximum');
  assert.equal(run({ feeRateBps: '0', trades: one }).ok, true);
});

test('trade count validation', () => {
  assert.deepEqual(run({ feeRateBps: '0', trades: [] }), err('EMPTY', 'trades', null));
  const trades = Array.from({ length: 21 }, () => buy('1', '1'));
  assert.deepEqual(run({ feeRateBps: '0', trades }), err('ROW_LIMIT', 'trades', 21));
});

test('side validation', () => {
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [{ side: 'hold', shares: '1', price: '1' }] }),
    err('ENUM', 'side', 1),
  );
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [buy('1', '1'), { side: 'BUY', shares: '1', price: '1' }] }),
    err('ENUM', 'side', 2),
  );
  // side is checked before shares/price within the row.
  assert.deepEqual(
    run({ feeRateBps: '0', trades: [{ side: 'x', shares: 'bad', price: 'bad' }] }),
    err('ENUM', 'side', 1),
  );
});

test('shares validation', () => {
  const at = (shares) => run({ feeRateBps: '0', trades: [buy(shares, '1')] });
  assert.deepEqual(at(''), err('EMPTY', 'shares', 1));
  assert.deepEqual(at('1234567890'), err('INPUT_LIMIT', 'shares', 1));
  assert.deepEqual(at('\uD800'), err('UNICODE', 'shares', 1));
  assert.deepEqual(at('007'), err('INTEGER_FORMAT', 'shares', 1));
  assert.deepEqual(at('1e3'), err('INTEGER_FORMAT', 'shares', 1));
  assert.deepEqual(at('1.0'), err('INTEGER_FORMAT', 'shares', 1));
  assert.deepEqual(at('-5'), err('INTEGER_FORMAT', 'shares', 1));
  assert.deepEqual(at('１２３'), err('INTEGER_FORMAT', 'shares', 1));
  assert.deepEqual(at('0'), err('RANGE', 'shares', 1));
  assert.equal(at('999999999').ok, true, 'shares maximum is valid');
  assert.equal(at('1').ok, true);
});

test('price validation', () => {
  const at = (price) => run({ feeRateBps: '0', trades: [buy('1', price)] });
  assert.deepEqual(at(''), err('EMPTY', 'price', 1));
  assert.deepEqual(at('1234567890123'), err('INPUT_LIMIT', 'price', 1));
  assert.deepEqual(at('1\uD800'), err('UNICODE', 'price', 1));
  assert.deepEqual(at('.5'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at('5.'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at('05'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at('00.5'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at('5.12345'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at('1,000'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at(' 5'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at('+5'), err('DECIMAL_FORMAT', 'price', 1));
  assert.deepEqual(at('10000000'), err('DECIMAL_FORMAT', 'price', 1), 'integer part is at most 7 digits');
  assert.deepEqual(at('0'), err('RANGE', 'price', 1));
  assert.deepEqual(at('0.0000'), err('RANGE', 'price', 1));
  assert.deepEqual(at('9999999'), err('RANGE', 'price', 1), 'above 1,000,000.0000');
  assert.equal(at('0.0001').ok, true, 'minimum price is valid');
  assert.equal(at('1000000.0000').ok, true, 'maximum price is valid');
  assert.equal(at('0.5').ok, true);
});

test('first error wins across rows', () => {
  const input = {
    feeRateBps: '0',
    trades: [buy('1', '1'), buy('x', '1'), buy('1', 'bad')],
  };
  assert.deepEqual(run(input), err('INTEGER_FORMAT', 'shares', 2));
});

test('OVERSOLD points at the failing sell row, including after a flat sell', () => {
  const input = {
    feeRateBps: '0',
    trades: [buy('10', '5'), sell('10', '6'), sell('1', '6')],
  };
  assert.deepEqual(run(input), err('OVERSOLD', 'trades', 3));
});

test('partial reliefs of one lot sum exactly to the lot cost (no residue)', () => {
  // Lot cost is 3 × 0.0001 = 0.0003 (3 µ). Three 1-share reliefs must each
  // be 0.0001 and the total relieved must be exactly 0.0003.
  const input = {
    feeRateBps: '0',
    trades: [buy('3', '0.0001'), sell('1', '0.0002'), sell('1', '0.0002'), sell('1', '0.0002')],
  };
  const { result } = run(input);
  assert.deepEqual(result.sells.map((s) => s.costRelieved), ['0.0001', '0.0001', '0.0001']);
  assert.equal(result.totalSharesHeld, 0);
  assert.equal(result.totalCostBasis, '0.0000');
  assert.deepEqual(result.remainingLots, []);
});

test('repeated partial relief then final full relief settles the lot exactly', () => {
  // Buy 3 @ 10.0001 → lot cost 30.0003. Sell 1, 1, 1: each relief is
  // round-half-up of the running balance split, and the last settles the
  // exact remainder; the three reliefs sum to 30.0003.
  const input = {
    feeRateBps: '0',
    trades: [buy('3', '10.0001'), sell('1', '11'), sell('1', '11'), sell('1', '11')],
  };
  const { result } = run(input);
  assert.deepEqual(result.sells.map((s) => s.costRelieved), ['10.0001', '10.0001', '10.0001']);
  assert.equal(result.totalRealizedPnl, '2.9997');
  assert.equal(result.averageCostPerShare, null);
});

test('zero realized P&L carries no minus sign', () => {
  const { result } = run({ feeRateBps: '0', trades: [buy('100', '10'), sell('100', '10')] });
  assert.equal(result.sells[0].realizedPnl, '0.0000');
  assert.equal(result.totalRealizedPnl, '0.0000');
});

test('sells keep their original row numbers when buys interleave', () => {
  const input = {
    feeRateBps: '0',
    trades: [buy('10', '10'), sell('5', '12'), buy('10', '20'), sell('5', '22')],
  };
  const { result } = run(input);
  assert.deepEqual(result.sells.map((s) => s.row), [2, 4]);
  assert.deepEqual(result.sells.map((s) => s.costRelieved), ['50.0000', '50.0000']);
  assert.equal(result.totalSharesHeld, 10);
  assert.equal(result.totalCostBasis, '200.0000');
  assert.equal(result.averageCostPerShare, '20.0000');
});

test('maximum-size trade stays exact (BigInt money path, beyond float53)', () => {
  // 999,999,999 shares @ 1,000,000.0000 with a 1000 bps (10%) fee.
  // amount = 9,999,999,990,000,000,000 µ; fee = amount / 10 exactly;
  // lot cost = 10,999,999,989,000,000,000 µ — beyond Number.MAX_SAFE_INTEGER,
  // so any float in the money path would corrupt these strings.
  const { result } = run({
    feeRateBps: '1000',
    trades: [buy('999999999', '1000000.0000')],
  });
  assert.equal(result.totalSharesHeld, 999999999);
  assert.equal(result.totalFees, '99999999900000.0000');
  assert.equal(result.totalCostBasis, '1099999998900000.0000');
  assert.equal(result.averageCostPerShare, '1100000.0000');
});

test('run does not mutate its input', () => {
  const input = {
    feeRateBps: '100',
    trades: [buy('7', '14.2857'), sell('3', '15')],
  };
  const before = JSON.stringify(input);
  run(input);
  assert.equal(JSON.stringify(input), before);
});
