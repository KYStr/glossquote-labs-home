import test from 'node:test'; // 使用內建測試執行器。
import assert from 'node:assert/strict'; // 嚴格比對固定契約。
import { readFileSync } from 'node:fs'; // 讀取獨立字面預期。
import { generateLayout } from '../public/core.mjs'; // 測試實際純核心。
const block = (r = '1', c = '1', re = '2', ce = '2') => ({ rowStart: r, columnStart: c, rowEnd: re, columnEnd: ce }); // 建立四個字串欄位。
const raw = () => ({ columns: '3', rows: '2', rowHeight: '80', gap: '8', blocks: [block()] }); // 每例使用獨立初值。
const error = (v, code, field, index = null, blocks = null) => assert.deepEqual(generateLayout(v), { ok: false, error: { code, field, index, blocks } }); // 不只比對錯誤碼。
test('例 A 與獨立 CSS 字面完全一致', () => { // 不以序列化器自己產預期。
  const v = raw(); v.blocks = [block('1','1','2','4'), block('2','1','3','2'), block('2','2','3','4')]; // 規格三矩形。
  const r = generateLayout(v); assert.equal(r.ok, true); assert.equal(r.value.css, readFileSync(new URL('./example-a.css', import.meta.url), 'utf8')); // 比對全部位元文字。
  assert.equal(r.value.occupiedCells, 6); assert.equal(r.value.emptyCells, 0); assert.equal(Buffer.byteLength(r.value.css), 1034); // 獨立面積與 bytes。
  assert.equal(Object.isFrozen(r.value.blocks[0]), true); v.blocks[0].rowStart = '2'; assert.equal(r.value.blocks[0].rowStart, 1); // 快照不受後改污染。
}); // 例 A 完成。
test('結構優先且不執行 getter', () => { // 描述符與數量優先。
  let reads = 0; const v = raw(); Object.defineProperty(v, 'columns', { enumerable: true, get() { reads++; return '3'; } }); error(v, 'E_SCHEMA', 'root'); assert.equal(reads, 0); // 根 getter 不讀。
  const many = raw(); many.blocks = new Array(13); Object.defineProperty(many.blocks, '0', { get() { reads++; return block(); } }); error(many, 'E_BLOCK_COUNT', 'blocks'); assert.equal(reads, 0); // 超量先拒。
  const later = raw(); later.blocks = [block('bad'), { ...block(), extra: 'x' }]; error(later, 'E_SCHEMA', 'block', 1); // 所有結構先於值。
  const hole = raw(); hole.blocks = new Array(1); error(hole, 'E_SCHEMA', 'blocks'); // 洞不是區塊。
  const symbol = raw(); symbol[Symbol('extra')] = 1; error(symbol, 'E_SCHEMA', 'root'); // 額外 Symbol 拒絕。
}); // 結構案例完成。
test('canonical 字串與範圍邊界', () => { // 不接受默默正規化。
  for (const s of ['-0','+1','01',' 1','1\n','１','1e2','1.0']) { const v = raw(); v.gap = s; error(v, 'E_INTEGER', 'gap'); } // 三碼內格式非法。
  for (const [s, code] of [['','E_REQUIRED'],['1600','E_RAW_LENGTH'],['-1','E_RANGE'],['33','E_RANGE']]) { const v = raw(); v.gap = s; error(v, code, 'gap'); } // 固定長度與範圍順序。
  const v = raw(); v.columns = '0'; v.rows = ''; error(v, 'E_RANGE', 'columns'); // 全域首錯。
}); // 格式案例完成。
test('關係與重疊採固定順序', () => { // 半開區間判定。
  const order = raw(); order.blocks = [block('2','1','2','2'), block('bad')]; error(order, 'E_ORDER', 'rowEnd', 0); // 本塊關係先於下一塊數值。
  const overlap = raw(); overlap.blocks = [block(),block(),block()]; error(overlap, 'E_OVERLAP', 'rowStart', 1, [0,1]); // 首 pair。
  const touch = raw(); touch.blocks = [block(),block('1','2','2','3')]; assert.equal(generateLayout(touch).ok, true); // 共邊合法。
}); // 幾何契約完成。
test('最大與最小有界結果', () => { // 固定最大模板及單格。
  const v = raw(); Object.assign(v, { columns:'6', rows:'6', rowHeight:'160', gap:'32' }); v.blocks = Array.from({length:12}, (_,i) => block(String(1+Math.floor(i/6)),String(1+i%6),String(2+Math.floor(i/6)),String(2+i%6))); // 前兩列十二格。
  const r = generateLayout(v); assert.equal(r.ok,true); assert.equal(r.value.occupiedCells,12); assert.equal(r.value.emptyCells,24); assert.equal(Buffer.byteLength(r.value.css),3052); // 獨立最大 oracle。
  Object.assign(v,{columns:'1',rows:'1',rowHeight:'24',gap:'32',blocks:[block()]}); const one=generateLayout(v); assert.equal(one.value.occupiedCells,1); assert.equal(one.value.emptyCells,0); // 間距不加入格數。
}); // 邊界案例完成。
