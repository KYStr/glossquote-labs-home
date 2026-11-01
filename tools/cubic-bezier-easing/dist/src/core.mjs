export const FIELDS = Object.freeze(['x1', 'y1', 'x2', 'y2']); // 固定欄位順序決定首錯與序列化。
export const TIMES = Object.freeze(Array.from({length: 9}, (_, i) => i * 125000)); // 九個靜態時間採整數百萬分之一。
export function parse(raw) { // 在讀值前驗證封閉資料結構。
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {error: {code: 'FORM_SCHEMA'}}; // 拒絕非物件與陣列。
  const proto = Object.getPrototypeOf(raw); // 僅允許普通物件與無原型物件。
  const keys = Reflect.ownKeys(raw); // 同時偵測符號與不可列舉的額外欄位。
  const desc = Object.getOwnPropertyDescriptors(raw); // 取得描述符而不執行存取器。
  if ((proto !== null && proto !== Object.prototype) || keys.length !== 4 || keys.some(k => !FIELDS.includes(k)) || FIELDS.some(k => !desc[k]?.enumerable || !Object.hasOwn(desc[k], 'value'))) return {error: {code: 'FORM_SCHEMA'}}; // 結構不符時不讀任何欄位。
  const values = {}; // 暫存通過驗證的千分整數。
  for (const field of FIELDS) { // 固定順序回傳唯一首錯。
    const value = desc[field].value; // 結構驗證後才取資料屬性。
    if (typeof value !== 'string') return {error: {field, code: 'TYPE'}}; // 不做隱式型別轉換。
    if (value.length < 1 || value.length > 16) return {error: {field, code: 'LENGTH'}}; // 限制原始 UTF-16 長度。
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?$/.exec(value); // 僅接受有限 ASCII 十進位文法。
    if (!match || match[0] !== value) return {error: {field, code: 'FORMAT'}}; // 拒絕尾端換行與所有部分匹配。
    const negative = value.startsWith('-'); // 分離負號以整數方式解析。
    const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.'); // 不經浮點解析小數。
    const integer = (BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'))) * (negative ? -1n : 1n); // 精確建立有號千分整數。
    const isX = field.startsWith('x'); // x 與 y 使用不同的範圍契約。
    if (integer < (isX ? 0n : -1000n) || integer > (isX ? 1000n : 2000n)) return {error: {field, code: 'RANGE'}}; // 邊界比較仍使用 BigInt。
    values[field] = Number(integer); // 通過小範圍驗證後安全轉整數。
  } // 結束四欄驗證。
  return {values: Object.freeze(values)}; // 有效輸入不可再被外部更改。
} // 結束封閉解析器。
export function axis(a, b, n, d) { // 用 Bernstein 多項式保留精確有理數。
  const u = d - n; // 參數的互補分子。
  return {n: 3n * u * u * n * BigInt(a) + 3n * u * n * n * BigInt(b) + 1000n * n * n * n, d: 1000n * d * d * d}; // 正分母下的有號軸座標。
} // 結束單軸運算。
export function solve(values, q) { // 固定四十輪二分求時間對應的進度。
  if (!Number.isInteger(q) || q < 0 || q > 1000000) throw new RangeError('Q'); // 防止非公開時間進入核心。
  if (q === 0 || q === 1000000) return Object.freeze({n: BigInt(q / 1000000), d: 1n}); // 端點必須精確。
  let low = 0n; // 低端以目前共同 dyadic 分母表示。
  let high = 1n; // 初始高端為一。
  let denominator = 1n; // 每輪將共同分母乘二。
  for (let i = 0; i < 40; i += 1) { // 不以浮點殘差或 Newton 提早停止。
    const middle = low + high; // 舊分母下兩端和就是新分母下中點。
    denominator *= 2n; // 中點的 dyadic 分母。
    low *= 2n; high *= 2n; // 兩端同步轉成新分母。
    const x = axis(values.x1, values.x2, middle, denominator); // 精確求中點時間。
    const difference = x.n * 1000000n - BigInt(q) * x.d; // 交叉相乘比較公開時間。
    if (difference === 0n) return Object.freeze(axis(values.y1, values.y2, middle, denominator)); // 精確相等才能提早返回。
    if (difference < 0n) low = middle; else high = middle; // 保留包含根的區間。
  } // 完成固定四十輪。
  return Object.freeze(axis(values.y1, values.y2, low + high, denominator * 2n)); // 最後取區間中點，分母不超過二的四十一次方。
} // 結束反解。
export const numeric = rational => Number(rational.n) / Number(rational.d); // 只在呈現邊界轉浮點。
export function percent(rational) { // 百分比保留三位並採半離零捨入。
  const negative = rational.n < 0n; // 保存負數方向。
  const magnitude = (negative ? -rational.n : rational.n) * 100000n; // 一單位進度等於十萬個千分百分點。
  const rounded = (magnitude * 2n + rational.d) / (rational.d * 2n); // 整數除法實作半離零。
  return `${negative && rounded !== 0n ? '-' : ''}${rounded / 1000n}.${String(rounded % 1000n).padStart(3, '0')}%`; // 不產生負零。
} // 結束百分比格式化。
export function decimal(integer) { // 將千分整數轉為最短固定小數。
  const sign = integer < 0 ? '-' : ''; // 零永遠沒有負號。
  const absolute = Math.abs(integer); // 已驗證整數不會溢位。
  const tail = String(absolute % 1000).padStart(3, '0').replace(/0+$/, ''); // 只移除小數尾零。
  return `${sign}${Math.floor(absolute / 1000)}${tail ? `.${tail}` : ''}`; // 保留必要小數點。
} // 結束控制值格式化。
export function snapshot(values) { // 單一快照供圖表與 CSS 共用。
  const copy = Object.freeze({...values}); // 隔離呼叫端物件。
  const css = `animation-timing-function: cubic-bezier(${FIELDS.map(k => decimal(copy[k])).join(', ')});\n`; // 固定 ASCII 宣告與一個 LF。
  const samples = Object.freeze(TIMES.map(q => Object.freeze({q, y: solve(copy, q)}))); // 逐列凍結九個樣本。
  const points = Object.freeze(Array.from({length: 257}, (_, k) => Object.freeze({x: axis(copy.x1, copy.x2, BigInt(k), 256n), y: axis(copy.y1, copy.y2, BigInt(k), 256n)}))); // 固定二百五十七個參數點。
  return Object.freeze({values: copy, css, samples, points}); // 所有結果來自同一不可變資料。
} // 結束快照建立。
