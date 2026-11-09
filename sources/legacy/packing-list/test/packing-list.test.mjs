import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyDraft, createRowDraft, parseInteger, validateDraft, makeExampleList, exportBackup } from '../public/js/core/packing-list.mjs';

const one = (quantityRaw = '1', unitWeightGramsRaw = '') => ({ rows: [{ ...createRowDraft('row-1'), quantityRaw, unitWeightGramsRaw }], limitGramsRaw: '' });
const issue = draft => { const result = validateDraft(draft); assert.equal(result.ok, false); assert.equal(result.summary, null); return result.code ?? result.fieldErrors[0].code; };
const summary = draft => { const result = validateDraft(draft); assert.equal(result.ok, true); return result.summary; };
const pair = () => ({ rows: [
  { ...createRowDraft('row-1'), quantityRaw: '2', unitWeightGramsRaw: '350', packed: true },
  { ...createRowDraft('row-2'), unitWeightGramsRaw: '200' }
], limitGramsRaw: '900' });

test('A01 empty draft has no all-packed percentage or total', () => {
  assert.deepEqual(createEmptyDraft(), { rows: [], limitGramsRaw: '' });
  assert.deepEqual(summary(createEmptyDraft()), { rowCount: 0, pieceCount: 0, packedRows: 0, packedPieces: 0,
    knownSubtotalGrams: 0, unknownWeightRows: 0, unknownWeightPieces: 0, totalWeightGrams: null,
    limitGrams: null, limitStatus: 'empty', overByGrams: null, minimumOverByGrams: null });
});
test('A02 new row defaults', () => assert.deepEqual(createRowDraft('row-1'), { id: 'row-1', nameRaw: '', quantityRaw: '1', unitWeightGramsRaw: '', packed: false }));
test('A03 max quantity and weight are exact integers', () => { const result = validateDraft(one('99', '99999')); assert.equal(result.list.rows[0].quantity, 99); assert.equal(result.summary.totalWeightGrams, 9899901); });
test('A04 zero is known', () => { const s = summary(one('1', '0')); assert.equal(s.totalWeightGrams, 0); assert.equal(s.unknownWeightRows, 0); });
test('A05 blank weight stays null', () => { const result = validateDraft(one('1', '  ')); assert.equal(result.list.rows[0].unitWeightGrams, null); assert.equal(result.summary.totalWeightGrams, null); });
test('A06 invalid quantities invalidate the entire summary', () => { for (const [raw, code] of [['0', 'OUT_OF_RANGE'], ['-1', 'INTEGER_REQUIRED'], ['1.5', 'INTEGER_REQUIRED'], ['', 'INTEGER_REQUIRED']]) assert.equal(issue(one(raw)), code); });
test('A07 weight upper bound', () => assert.equal(issue(one('1', '100000')), 'OUT_OF_RANGE'));
test('A08 empty limit', () => assert.equal(summary(one()).limitGrams, null));
test('A09 zero limit rejected', () => assert.equal(issue({ ...one(), limitGramsRaw: '0' }), 'OUT_OF_RANGE'));
test('A10 maximum limit accepted', () => assert.equal(summary({ ...one(), limitGramsRaw: '999999999' }).limitGrams, 999999999));
test('A11 limit above maximum rejected', () => assert.equal(issue({ ...one(), limitGramsRaw: '1000000000' }), 'OUT_OF_RANGE'));
test('A12 ASCII whitespace and leading zeros', () => assert.deepEqual(parseInteger('\t\n\v\f\r 0012 ', { min: 1, max: 99 }), { ok: true, value: 12 }));
test('A13 strict ASCII integer grammar', () => { for (const raw of ['１', '+1', '1e2', '1,000', '-0', '12\u00a0', '0x12', '2 3']) assert.equal(issue(one(raw)), 'INTEGER_REQUIRED'); });
test('A14 length checked before trim (no truncation)', () => { for (const field of ['quantityRaw', 'unitWeightGramsRaw', 'limitGramsRaw']) { const draft = one(); if (field === 'limitGramsRaw') draft[field] = ' '.repeat(32) + '1'; else draft.rows[0][field] = '0'.repeat(32) + '1'; assert.equal(issue(draft), 'INPUT_TOO_LONG'); } });
test('A15 name uses raw UTF-16 length; allows emoji and ZWJ', () => { const draft = one(); draft.rows[0].nameRaw = '😀'.repeat(40); assert.equal(validateDraft(draft).ok, true); draft.rows[0].nameRaw += 'x'; assert.equal(issue(draft), 'INVALID_NAME'); draft.rows[0].nameRaw = '👩‍🚀'; assert.equal(validateDraft(draft).ok, true); });
test('A16 markup is a plain string in the validated model', () => { const draft = one(); draft.rows[0].nameRaw = '<img src=x onerror=1>'; assert.equal(validateDraft(draft).list.rows[0].name, draft.rows[0].nameRaw); });
test('A17 controls rejected, including C1', () => { for (const code of [0, 10, 31, 127, 128, 159]) { const draft = one(); draft.rows[0].nameRaw = 'a' + String.fromCharCode(code); assert.equal(issue(draft), 'CONTROL_CHARACTER'); } });
test('A18 blank names export empty, without UI fallback', () => { const draft = one(); draft.rows[0].nameRaw = '  '; assert.equal(JSON.parse(exportBackup(draft).json).rows[0].name, ''); assert.equal(draft.rows[0].nameRaw, '  '); });
test('A19 maximum rows, pieces and worst-case weight', () => { const draft = { rows: Array.from({ length: 100 }, (_, n) => ({ ...createRowDraft(`row-${n}`), quantityRaw: '99', unitWeightGramsRaw: '99999' })), limitGramsRaw: '' }; assert.equal(summary(draft).totalWeightGrams, 989990100); assert.equal(summary(draft).pieceCount, 9900); draft.rows.push(createRowDraft('extra')); assert.equal(issue(draft), 'ROW_LIMIT'); });
test('A20 second duplicate ID is first field error', () => { const draft = pair(); draft.rows[1].id = 'row-1'; const result = validateDraft(draft); assert.deepEqual(result, { ok: false, code: null, fieldErrors: [{ rowIndex: 1, field: 'id', code: 'DUPLICATE_ID' }], summary: null }); });
test('A21 exact total equals limit', () => { const s = summary(pair()); assert.equal(s.pieceCount, 3); assert.equal(s.totalWeightGrams, 900); assert.equal(s.limitStatus, 'within'); });
test('A22 progress denominators remain separate', () => { const s = summary(pair()); assert.equal(s.packedRows, 1); assert.equal(s.rowCount, 2); assert.equal(s.packedPieces, 2); assert.equal(s.pieceCount, 3); });
test('A23 unknown rows and pieces; no total', () => { const draft = pair(); draft.rows[1].quantityRaw = '4'; draft.rows[1].unitWeightGramsRaw = ''; const s = summary(draft); assert.equal(s.knownSubtotalGrams, 700); assert.equal(s.unknownWeightRows, 1); assert.equal(s.unknownWeightPieces, 4); assert.equal(s.totalWeightGrams, null); });
test('A24 over limit with unknown weights gives only minimum excess', () => { const draft = pair(); draft.rows[1].unitWeightGramsRaw = ''; draft.limitGramsRaw = '500'; const s = summary(draft); assert.equal(s.limitStatus, 'over-known-minimum'); assert.equal(s.minimumOverByGrams, 200); assert.equal(s.totalWeightGrams, null); assert.equal(s.overByGrams, null); });
test('A25 exact complete excess', () => { const s = summary({ ...one('1', '501'), limitGramsRaw: '500' }); assert.equal(s.limitStatus, 'over'); assert.equal(s.overByGrams, 1); });
test('A26 equal is within', () => assert.equal(summary({ ...one('1', '500'), limitGramsRaw: '500' }).limitStatus, 'within'));
test('A27 empty with limit never claims total/all packed', () => { const s = summary({ rows: [], limitGramsRaw: '100' }); assert.equal(s.limitStatus, 'empty'); assert.equal(s.totalWeightGrams, null); });
test('A28 weekend example exact values and translated names', () => { const example = makeExampleList(); assert.deepEqual(example.rows.map(row => [row.nameRaw, row.quantityRaw, row.unitWeightGramsRaw]), [['衣物', '2', '300'], ['充電器', '1', '200']]); assert.equal(summary(example).totalWeightGrams, 800); assert.equal(summary(example).unknownWeightRows, 0); assert.equal(makeExampleList('en').rows[1].nameRaw, 'Charger'); });
test('A37 textarea/script markup stays plain text', () => { const draft = one(); draft.rows[0].nameRaw = '</textarea><script>'; assert.equal(validateDraft(draft).list.rows[0].name, '</textarea><script>'); });
test('A39 equal known subtotal plus unknown does not claim within', () => { const draft = pair(); draft.rows[0].unitWeightGramsRaw = '250'; draft.rows[1].unitWeightGramsRaw = ''; draft.limitGramsRaw = '500'; const s = summary(draft); assert.equal(s.limitStatus, 'unknown-weight'); assert.equal(s.overByGrams, null); });
test('A40 exact own keys, no accessor calls, dense data arrays', () => {
  for (const rowLevel of [false, true]) for (const key of ['hidden', Symbol('extra')]) {
    const draft = one(); Object.defineProperty(rowLevel ? draft.rows[0] : draft, key, { value: true });
    assert.equal(issue(draft), 'UNKNOWN_FIELD');
  }
  let calls = 0;
  for (const rowLevel of [false, true]) {
    const draft = one(); Object.defineProperty(rowLevel ? draft.rows[0] : draft, rowLevel ? 'nameRaw' : 'rows', { get() { calls++; return 'secret'; } });
    assert.equal(issue(draft), 'INVALID_SCHEMA');
  }
  assert.equal(calls, 0);
  const sparse = one(); sparse.rows.length = 2; assert.equal(issue(sparse), 'ROW_LIMIT');
  const extra = one(); extra.rows.extra = 1; assert.equal(issue(extra), 'ROW_LIMIT');
  const access = one(); Object.defineProperty(access.rows, '0', { get() { calls++; } }); assert.equal(issue(access), 'ROW_LIMIT'); assert.equal(calls, 0);
  const nonEnumerable = one(); Object.defineProperty(nonEnumerable.rows, '0', { value: nonEnumerable.rows[0], enumerable: false }); assert.equal(issue(nonEnumerable), 'ROW_LIMIT');
  const frozen = one(); Object.freeze(frozen.rows[0]); Object.freeze(frozen.rows); Object.freeze(frozen); assert.equal(validateDraft(frozen).ok, true);
  const nullPrototype = Object.assign(Object.create(null), one()); assert.equal(validateDraft(nullPrototype).ok, true);
  assert.equal(issue(Object.assign(Object.create({}), one())), 'INVALID_SCHEMA');
});
test('deterministic first field ordering and exact root failures', () => {
  const draft = one('0', '-1'); draft.rows[0].nameRaw = 'x\n'; draft.limitGramsRaw = '0';
  assert.deepEqual(validateDraft(draft).fieldErrors, [{ rowIndex: 0, field: 'nameRaw', code: 'CONTROL_CHARACTER' }]);
  assert.equal(issue({ rows: [] }), 'INVALID_SCHEMA');
  assert.equal(issue({ rows: [], limitGramsRaw: 1 }), 'INVALID_SCHEMA');
  const row = one(); delete row.rows[0].packed; assert.equal(issue(row), 'INVALID_ROW');
});
