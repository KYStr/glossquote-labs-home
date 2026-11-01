import test from 'node:test'; // 使用 Node 內建測試框架。
import assert from 'node:assert/strict'; // 失敗直接保留精確期望。
import {parse, solve, snapshot, numeric, percent, decimal, TIMES} from '../src/core.mjs'; // 被測產品核心與獨立 oracle 分離。
const raw = (x1 = '0.25', y1 = '0.1', x2 = '0.25', y2 = '1') => ({x1, y1, x2, y2}); // 固定合法初值。
const values = (...args) => parse(raw(...args)).values; // 測試只用已解析值。
function referenceAxis(a, b, n, d) { // 獨立 de Casteljau 算法不調產品 axis。
  const points = [0n, BigInt(a), BigInt(b), 1000n]; // 千分控制多邊形。
  for (let level = 3; level > 0; level -= 1) for (let i = 0; i < level; i += 1) points[i] = points[i] * (d - n) + points[i + 1] * n; // 三層線性插值，各層共同增加分母。
  return {n: points[0], d: 1000n * d ** 3n}; // 獨立多項式結果。
} // 結束獨立軸運算。
function reference(v, q) { // 八十輪固定整數格線二分作獨立精度參照。
  if (q === 0 || q === 1000000) return q / 1000000; // 參照端點精確。
  const d = 2n ** 81n; let lo = 0n, hi = d; // 參照分母與產品逐輪分母策略不同。
  for (let i = 0; i < 80; i += 1) { const mid = (lo + hi) / 2n, x = referenceAxis(v.x1, v.x2, mid, d); if (x.n * 1000000n < BigInt(q) * x.d) lo = mid; else hi = mid; } // 不匯入產品反解器。
  const y = referenceAxis(v.y1, v.y2, (lo + hi) / 2n, d); return Number(y.n) / Number(y.d); // 只在最終比較轉浮點。
} // 結束高精度參照。
test('T01 literal curves, nine samples and CSS bytes', () => { // 固定解析例子的期望不是產品自行產生。
  const fixtures = [['0', '0', '1', '1', 500000, .5], ['1', '1', '0', '0', 500000, .5], ['0', '1', '0', '1', 125000, .875], ['1', '0', '1', '0', 875000, .125], ['0', '-1', '1', '-1', 500000, -.625], ['0', '2', '1', '2', 500000, 1.625]]; // 獨立解析的六個字面例子。
  for (const [a,b,c,d,q,y] of fixtures) assert.ok(Math.abs(numeric(solve(values(a,b,c,d), q)) - y) < 5e-12); // 契約誤差不放寬。
  const s = snapshot(values('-0.000','0.100','1.000','2.000')); assert.equal(s.css, 'animation-timing-function: cubic-bezier(0, 0.1, 1, 2);\n'); // 精確空白、負零、分號及 LF。
  assert.equal(s.samples.length, 9); assert.deepEqual(s.samples.map(x=>x.q), TIMES); assert.equal(s.points.length, 257); assert.ok(Object.isFrozen(s) && Object.isFrozen(s.values) && Object.isFrozen(s.samples[0])); // 固定數量與不可變快照。
}); // 結束 T01。
test('T02 schema rejects accessors without executing getters', () => { // 結構錯誤優先且不能觸發存取器。
  let called = 0; const getter = raw(); Object.defineProperty(getter, 'x1', {enumerable: true, get() { called += 1; return '0'; }}); // 可觀察的惡意 getter。
  const extra = raw(); extra[Symbol('extra')] = '0'; const hidden = raw(); Object.defineProperty(hidden, 'extra', {value: 1}); // 符號與不可列舉額外欄皆非法。
  for (const value of [null, [], 1, 'x', new Date(), {...raw(), extra:'0'}, {x1:'0'}, getter, extra, hidden, Object.create(raw())]) assert.equal(parse(value).error.code, 'FORM_SCHEMA'); // 覆蓋所有結構分支。
  assert.equal(called, 0); assert.ok(parse(Object.assign(Object.create(null), raw())).values); // 無原型物件合法。
}); // 結束 schema 測試。
test('T02 all raw lexical and type boundaries', () => { // 不接受靜默正規化。
  for (const value of [1, null, undefined, {}, [], true]) assert.equal(parse({...raw(), x1:value}).error.code, 'TYPE'); // 型別先於長度。
  for (const value of ['', '0'.repeat(17)]) assert.equal(parse({...raw(), x1:value}).error.code, 'LENGTH'); // 原始長度不可裁切。
  for (const value of ['+1','.5','1.','01','1e0','NaN','Infinity',' 0','0 ','0\n','0\r\n','０','−0','0,1','0.0000','--0','<img>']) assert.equal(parse({...raw(), x1:value}).error.code, 'FORMAT', value); // 末端換行不能通過正規式。
  const unordered = {y2:'bad', x2:'bad', y1:'bad', x1:'bad'}; assert.equal(parse(unordered).error.field,'x1'); // 首錯不依物件插入順序。
}); // 結束 raw 測試。
test('T03 inclusive ranges and adjacent thousandths', () => { // 各欄邊界獨立驗證。
  assert.ok(values('0','-1','1','2')); assert.ok(values('1','2','0','-1')); // x1大於x2不是錯。
  for (const [field,value] of [['x1','-0.001'],['x2','1.001'],['y1','-1.001'],['y2','2.001'],['x1','9999999999999999']]) assert.equal(parse({...raw(),[field]:value}).error.code,'RANGE'); // BigInt 範圍比較不溢位。
  assert.equal(values('-0','-0.000','0','0').x1,0); assert.equal(decimal(-1),'-0.001'); // 負零與最小千分值。
}); // 結束邊界測試。
test('T04 singular and adversarial controls versus independent 80 rounds', () => { // 保留奇異點附近的嚴格不等。
  const v=values('1','1','0','0'); assert.ok(numeric(solve(v,499999))<.5); assert.ok(numeric(solve(v,500001))>.5); // 防止以 x 殘差提早返回。
  for (const x1 of [0,1,250,999,1000]) for (const x2 of [0,1,500,999,1000]) for (const [y1,y2] of [[-1000,2000],[2000,-1000],[0,1000]]) { // 有限固定對抗組合。
    const v={x1,x2,y1,y2}; for (const q of [1,125000,499999,500000,500001,875000,999999]) assert.ok(Math.abs(numeric(solve(v,q))-reference(v,q))<=5e-12,JSON.stringify({v,q})); // 不放寬指定進度誤差。
  } // 結束固定矩陣。
  for (const q of [-1,1000001,.5,NaN,Infinity]) assert.throws(()=>solve(v,q),RangeError); // 核心公開時間型別守衛。
}); // 結束精度矩陣。
test('T05 exact signed rounding, plot domain and endpoints', () => { // 格式化不依賴浮點 toFixed。
  for (const [n,d,want] of [[1n,200000n,'0.001%'],[-1n,200000n,'-0.001%'],[-1n,1000000n,'0.000%'],[13n,8n,'162.500%'],[-5n,8n,'-62.500%']]) assert.equal(percent({n,d}),want); // 正負半值遠離零。
  for (const y1 of ['-1','2']) for (const y2 of ['-1','2']) { const s=snapshot(values('1',y1,'0',y2)); assert.equal(numeric(s.points[0].y),0); assert.equal(numeric(s.points[256].y),1); for (const p of s.points) { assert.ok(numeric(p.x)>=0&&numeric(p.x)<=1); assert.ok(numeric(p.y)>=-1&&numeric(p.y)<=2); } } // 所有角落 y 控制組合都在固定圖域。
}); // 結束格式與繪圖核心檢查。
