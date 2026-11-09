import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudget, formatMinor, reportBudget } from '../public/js/core/subscription-budget.mjs';

const row = (overrides = {}) => ({ id: 'a', nameRaw: '影音', amountRaw: '100', period: 'monthly', plannedStop: false, ...overrides });
const request = (rows = [row()], currencyRaw = 'TWD') => ({ currencyRaw, rows });
const sample = () => request([
  row(), row({ id: 'b', nameRaw: '課程', amountRaw: '600', period: 'quarterly', plannedStop: true }),
  row({ id: 'c', nameRaw: '軟體', amountRaw: '1200', period: 'yearly' })
]);
const value = input => { const result = calculateBudget(input); assert.equal(result.ok, true); return result.value; };
const error = (input, code, row = null, field = null) => assert.deepEqual(calculateBudget(input), { ok: false, error: { code, row, field } });
const summary = (rowCount, annualMinor, monthlyMinor, monthlyApproximate = false) => ({ rowCount, annualMinor, monthlyMinor, monthlyApproximate });

test('A01 monthly base and exact output keys', () => {
  assert.deepEqual(value(request()), {
    currency: 'TWD', rows: [{ id: 'a', name: '影音', amountText: '100.00', period: 'monthly', plannedStop: false, annualMinor: 120000n, monthlyMinor: 10000n, monthlyApproximate: false }],
    current: summary(1, 120000n, 10000n), plannedStop: summary(0, 0n, 0n), retained: summary(1, 120000n, 10000n)
  });
});
test('A02 quarterly 600', () => assert.deepEqual(value(request([row({ amountRaw: '600', period: 'quarterly' })])).current, summary(1, 240000n, 20000n)));
test('A03 yearly 1200', () => assert.deepEqual(value(request([row({ amountRaw: '1200', period: 'yearly' })])).current, summary(1, 120000n, 10000n)));
test('A04 mixed example has fixed current/stop/retained totals', () => {
  const result = value(sample());
  assert.deepEqual(result.current, summary(3, 480000n, 40000n));
  assert.deepEqual(result.plannedStop, summary(1, 240000n, 20000n));
  assert.deepEqual(result.retained, summary(2, 240000n, 20000n));
});
test('A05 all planned stop', () => {
  const input = sample(); input.rows.forEach(item => { item.plannedStop = true; });
  const result = value(input);
  assert.deepEqual(result.retained, summary(0, 0n, 0n)); assert.deepEqual(result.current, result.plannedStop);
});
test('A06 all retained', () => {
  const input = sample(); input.rows.forEach(item => { item.plannedStop = false; });
  const result = value(input);
  assert.deepEqual(result.plannedStop, summary(0, 0n, 0n)); assert.deepEqual(result.current, result.retained);
});
test('A07 zero is a valid payment', () => assert.deepEqual(value(request([row({ amountRaw: '0' })])).current, summary(1, 0n, 0n)));
test('A08 yearly one cent is approximate zero monthly', () => assert.deepEqual(value(request([row({ amountRaw: '0.01', period: 'yearly' })])).current, summary(1, 1n, 0n, true)));
test('A09 half-up boundary at yearly six cents', () => assert.deepEqual(value(request([row({ amountRaw: '0.06', period: 'yearly' })])).current, summary(1, 6n, 1n, true)));
test('A10 twelve yearly cents round the annual total once', () => {
  const result = value(request(Array.from({ length: 12 }, (_, index) => row({ id: `r${index}`, amountRaw: '0.01', period: 'yearly' }))));
  assert.deepEqual(result.current, summary(12, 12n, 1n));
  assert.equal(result.rows.every(item => item.monthlyMinor === 0n && item.monthlyApproximate), true);
});
test('A11 maximum 60 monthly payments without overflow', () => {
  const result = value(request(Array.from({ length: 60 }, (_, index) => row({ id: `r${index}`, amountRaw: '1000000' }))));
  assert.deepEqual(result.current, summary(60, 72000000000n, 6000000000n));
  assert.equal(formatMinor(result.current.annualMinor), '720000000.00');
  assert.equal(formatMinor(result.current.monthlyMinor), '60000000.00');
});
test('A12 exact row count bounds', () => {
  error(request(Array.from({ length: 61 }, (_, index) => row({ id: `r${index}` }))), 'TOO_MANY_ROWS', null, 'rows');
  error(request([]), 'TOO_FEW_ROWS', null, 'rows');
});
test('A13 maximum plus one cent rejected', () => error(request([row({ amountRaw: '1000000.01' })]), 'AMOUNT_OUT_OF_RANGE', 1, 'amountRaw'));
test('A14 leading zeroes normalize to fixed two decimals', () => {
  const result = value(request([row({ amountRaw: '001.20' })]));
  assert.equal(result.rows[0].amountText, '1.20'); assert.deepEqual(result.current, summary(1, 1440n, 120n));
  assert.equal(value(request([row({ amountRaw: '0000000000000000' })])).rows[0].amountText, '0.00');
});
test('A15 invalid amount grammars are wholly rejected', () => {
  for (const amountRaw of ['1e2', '-1', '+1', '1,000', '１２', '1.234', '.5', '1.', '', ' 100 ', '100 ', ' ', '.', 'NaN', 'Infinity', '1\n', '1\t']) {
    error(request([row({ amountRaw })]), 'INVALID_AMOUNT', 1, 'amountRaw');
  }
});
test('A16 amount raw length gate precedes parsing', () => error(request([row({ amountRaw: '0'.repeat(17) })]), 'AMOUNT_RAW_TOO_LONG', 1, 'amountRaw'));
test('A17 currency is strict raw uppercase ASCII', () => {
  for (const currencyRaw of ['twd', '', ' TWD', 'TWD ', 'A'.repeat(13), 'ＴＷＤ', 'US1', 'TWD\n']) error(request([row()], currencyRaw), 'INVALID_CURRENCY', null, 'currencyRaw');
  assert.equal(value(request([row()], 'ABCDEFGHIJKL')).currency, 'ABCDEFGHIJKL');
});
test('A18 periods are a closed enum', () => {
  for (const period of ['weekly', 'MONTHLY', '', 'toString', '__proto__']) error(request([row({ period })]), 'INVALID_PERIOD', 1, 'period');
});
test('A19 exact field types', () => {
  for (const plannedStop of ['true', 0, null, undefined]) error(request([row({ plannedStop })]), 'INVALID_REQUEST');
  for (const [key, val] of [['id', 1], ['nameRaw', null], ['amountRaw', 100], ['period', {}]]) error(request([row({ [key]: val })]), 'INVALID_REQUEST');
  error(request([row()], 123), 'INVALID_REQUEST');
});
test('A20 duplicate names with different ids count separately and trim', () => {
  const result = value(request([row({ nameRaw: ' 影音 ' }), row({ id: 'b' })]));
  assert.deepEqual(result.current, summary(2, 240000n, 20000n)); assert.deepEqual(result.rows.map(item => item.name), ['影音', '影音']);
});
test('A21 duplicate and invalid ids', () => {
  error(request([row(), row()]), 'DUPLICATE_ID', 2, 'id');
  for (const id of ['', 'a b', '中', 'a'.repeat(41), 'a\n']) error(request([row({ id })]), 'INVALID_ID', 1, 'id');
});
test('A22 raw and trimmed name limits and missing name', () => {
  error(request([row({ nameRaw: 'a'.repeat(257) })]), 'NAME_RAW_TOO_LONG', 1, 'nameRaw');
  error(request([row({ nameRaw: ` ${'a'.repeat(81)} ` })]), 'NAME_TOO_LONG', 1, 'nameRaw');
  error(request([row({ nameRaw: '  ' })]), 'NAME_REQUIRED', 1, 'nameRaw');
  assert.equal(value(request([row({ nameRaw: ` ${'a'.repeat(80)} ` })])).rows[0].name.length, 80);
});
test('A23 controls and unpaired surrogates rejected, paired emoji accepted', () => {
  for (const nameRaw of ['x\u0000', '\nx', 'x\t', '\t', '\n', ' \t ', 'x\u001f', 'x\u007f', 'x\u0085', 'x\u009f', 'x\ud800', '\udc00x', '\ud800x\udc00']) error(request([row({ nameRaw })]), 'INVALID_NAME', 1, 'nameRaw');
  assert.equal(value(request([row({ nameRaw: '影音 🎬' })])).rows[0].name, '影音 🎬');
});
test('A24 markup is retained as text in the data/report', () => {
  const nameRaw = '<img src=x onerror=alert(1)>';
  const result = value(request([row({ nameRaw })]));
  assert.equal(result.rows[0].name, nameRaw); assert.ok(reportBudget(result, 'en').includes(nameRaw));
});
test('A25 exact records reject extras, symbols, hidden properties, accessors, prototypes and missing fields without getters', () => {
  let calls = 0;
  for (const level of ['root', 'row']) {
    for (const kind of ['extra', 'symbol', 'hidden', 'getter', 'setter', 'missing', 'prototype', 'array', 'null']) {
      const input = request();
      let target = level === 'root' ? input : input.rows[0];
      const required = level === 'root' ? 'currencyRaw' : 'nameRaw';
      if (kind === 'extra') target.extra = 'x';
      if (kind === 'symbol') target[Symbol('extra')] = 1;
      if (kind === 'hidden') Object.defineProperty(target, 'extra', { value: 1 });
      if (kind === 'getter') Object.defineProperty(target, required, { enumerable: true, get() { calls += 1; throw new Error('MUST_NOT_CALL'); } });
      if (kind === 'setter') Object.defineProperty(target, required, { enumerable: true, set() { calls += 1; } });
      if (kind === 'missing') delete target[required];
      if (kind === 'prototype') Object.setPrototypeOf(target, { extra: 1 });
      if (kind === 'array') target = Object.assign([], target);
      if (kind === 'null') target = null;
      if (level === 'row') { input.rows[0] = target; error(input, 'INVALID_REQUEST'); }
      else error(target, 'INVALID_REQUEST');
    }
  }
  const hiddenRequired = request();
  Object.defineProperty(hiddenRequired, 'currencyRaw', { enumerable: false }); error(hiddenRequired, 'INVALID_REQUEST');
  assert.equal(calls, 0);
});
test('A26 canonical dense arrays only, no index getter execution', () => {
  let calls = 0;
  const hole = new Array(1);
  class Rows extends Array {}
  const custom = [row()]; Object.setPrototypeOf(custom, null);
  const extra = [row()]; extra.other = 1;
  const getter = [row()]; Object.defineProperty(getter, '0', { enumerable: true, get() { calls += 1; throw new Error('MUST_NOT_CALL'); } });
  const hidden = [row()]; Object.defineProperty(hidden, '0', { enumerable: false });
  const symbol = [row()]; symbol[Symbol('x')] = 1;
  const noncanonical = [row()]; noncanonical['01'] = row();
  for (const rows of [hole, new Rows(row()), custom, extra, getter, hidden, symbol, noncanonical, {}, null]) error(request(rows), 'INVALID_REQUEST');
  assert.equal(calls, 0);
});
test('A27 null-prototype records are supported', () => {
  const input = Object.assign(Object.create(null), request([Object.assign(Object.create(null), row())]));
  assert.deepEqual(value(input), value(request()));
});
test('A28 schema, currency, count and per-row validation order are fixed', () => {
  const bad = request([row({ amountRaw: '-1', extra: 1 })], 'bad'); error(bad, 'INVALID_REQUEST');
  error(request([row({ amountRaw: '-1' }), row({ id: 'b', plannedStop: 'true' })]), 'INVALID_REQUEST');
  error(request([], 'bad'), 'INVALID_CURRENCY', null, 'currencyRaw');
  error(request([row({ id: '!', nameRaw: '', amountRaw: '0'.repeat(17) })]), 'INVALID_ID', 1, 'id');
  error(request([row({ nameRaw: '', amountRaw: '0'.repeat(17) })]), 'AMOUNT_RAW_TOO_LONG', 1, 'amountRaw');
  error(request([row({ nameRaw: '', period: 'bad', amountRaw: '-1' })]), 'NAME_REQUIRED', 1, 'nameRaw');
  error(request([row({ period: 'bad', amountRaw: '-1' })]), 'INVALID_PERIOD', 1, 'period');
  error(request([row({ amountRaw: '-1' }), row({ id: 'b', nameRaw: '' })]), 'INVALID_AMOUNT', 1, 'amountRaw');
  let calls = 0;
  const stopAtRoot = { currencyRaw: 1, get rows() { calls += 1; return []; } };
  error(stopAtRoot, 'INVALID_REQUEST'); assert.equal(calls, 0);
});

const EXPECTED_ZH = `訂閱費用盤點
幣別: TWD

訂閱明細
1. 影音 | 每次: 100.00 | 每月 | 全年: 1200.00 | 平均每月: 100.00 | 保留
2. 課程 | 每次: 600.00 | 每季 | 全年: 2400.00 | 平均每月: 200.00 | 計畫停用
3. 軟體 | 每次: 1200.00 | 每年 | 全年: 1200.00 | 平均每月: 100.00 | 保留

目前 (3 項) | 全年: 4800.00 | 平均每月: 400.00
計畫停用 (1 項) | 全年: 2400.00 | 平均每月: 200.00
保留 (2 項) | 全年: 2400.00 | 平均每月: 200.00

計算假設：月繳 × 12、季繳 × 4、年繳 × 1；平均每月為全年金額 ÷ 12。
先精確加總全年金額，再將月均四捨五入到分；「約」表示月均經捨入。逐列月均相加可能與總結相差數分；停用與保留月均相加則可能與目前月均相差 0.01。
依固定費率全年化；不含退款、稅、調價或取消費用。這不是今年實際帳單。
計畫停用只是試算，預計全年差額為勾選列全年合計；不會取消服務，也不保證實際節省。
所有金額須為同幣別；幣別標籤不會換匯。`;
const EXPECTED_EN = `Subscription budget
Currency: TWD

Subscription details
1. 影音 | Per payment: 100.00 | Monthly | Annual: 1200.00 | Monthly average: 100.00 | Retained
2. 課程 | Per payment: 600.00 | Quarterly | Annual: 2400.00 | Monthly average: 200.00 | Planned stop
3. 軟體 | Per payment: 1200.00 | Yearly | Annual: 1200.00 | Monthly average: 100.00 | Retained

Current (3 items) | Annual: 4800.00 | Monthly average: 400.00
Planned stop (1 item) | Annual: 2400.00 | Monthly average: 200.00
Retained (2 items) | Annual: 2400.00 | Monthly average: 200.00

Assumptions: monthly × 12, quarterly × 4, yearly × 1; monthly average = annual amount ÷ 12.
Exact annual amounts are summed before monthly averages are rounded half up to cents. “approx.” marks a rounded average. Row averages may differ from the total by a few cents; planned-stop and retained averages may differ from the current average by 0.01.
Annualized at fixed rates; excludes refunds, taxes, price changes and cancellation fees. This is not an actual bill for this year.
Planned stops are a scenario only. The estimated annual reduction is the selected rows’ annual total. No services are cancelled and actual savings are not guaranteed.
All amounts must use one currency; the currency label does not convert money.`;
test('A29 full bilingual deterministic reports, UTF-8 no BOM or trailing LF', () => {
  const result = value(sample());
  for (const [lang, expected] of [['zh-Hant', EXPECTED_ZH], ['en', EXPECTED_EN]]) {
    const text = reportBudget(result, lang);
    assert.equal(text, expected);
    const bytes = Buffer.from(text, 'utf8');
    assert.notDeepEqual([...bytes.subarray(0, 3)], [239, 187, 191]);
    assert.notEqual(bytes.at(-1), 10); assert.equal(bytes.toString('utf8'), expected);
  }
  assert.ok(reportBudget(value(request([row({ amountRaw: '0.06', period: 'yearly' })])), 'en').includes('Monthly average: approx. 0.01'));
});
test('A30 pure deterministic calculation does not mutate frozen inputs', () => {
  const input = sample(); const before = structuredClone(input);
  input.rows.forEach(Object.freeze); Object.freeze(input.rows); Object.freeze(input);
  assert.deepEqual(calculateBudget(input), calculateBudget(input)); assert.deepEqual(input, before);
});
test('A31 fixed 60-row mixed invariant oracle and independent group rounding', () => {
  // Twenty each monthly/quarterly/yearly at 1.01; ten of each are planned stops.
  const rows = Array.from({ length: 60 }, (_, index) => row({ id: `r${index}`, amountRaw: '1.01', period: ['monthly', 'quarterly', 'yearly'][index % 3], plannedStop: index % 2 === 0 }));
  const result = value(request(rows));
  assert.deepEqual(result.current, summary(60, 34340n, 2862n, true));
  assert.deepEqual(result.plannedStop, summary(30, 17170n, 1431n, true));
  assert.deepEqual(result.retained, summary(30, 17170n, 1431n, true));
  assert.equal(result.current.annualMinor, result.plannedStop.annualMinor + result.retained.annualMinor);
  const halves = value(request([row({ amountRaw: '0.06', period: 'yearly', plannedStop: true }), row({ id: 'b', amountRaw: '0.06', period: 'yearly' })]));
  assert.equal(halves.current.monthlyMinor, 1n);
  assert.equal(halves.plannedStop.monthlyMinor + halves.retained.monthlyMinor, 2n);
});
