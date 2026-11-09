const ROOT_FIELDS = ['currencyRaw', 'rows'];
const ROW_FIELDS = ['id', 'nameRaw', 'amountRaw', 'period', 'plannedStop'];
const MULTIPLIER = Object.freeze({ monthly: 12n, quarterly: 4n, yearly: 1n });

function failure(code, row = null, field = null) {
  return { ok: false, error: { code, row, field } };
}

// Inspect descriptors before values, including keys we do not recognize.
// No accessor is ever called by the schema validator.
function exactRecord(record, fields) {
  if (record === null || typeof record !== 'object') return null;
  const prototype = Object.getPrototypeOf(record);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(record);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) return null;
  const values = Object.create(null);
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(record, field);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
    values[field] = descriptor.value;
  }
  return values;
}

function exactRows(rows) {
  if (!Array.isArray(rows) || Object.getPrototypeOf(rows) !== Array.prototype) return null;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(rows, 'length');
  const length = lengthDescriptor.value;
  const keys = Reflect.ownKeys(rows);
  if (keys.length !== length + 1) return null;
  // This also rejects symbols, noncanonical index strings and additional properties.
  if (keys.some(key => key !== 'length' &&
      (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= length))) return null;
  const values = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(rows, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
    const row = exactRecord(descriptor.value, ROW_FIELDS);
    if (!row || ROW_FIELDS.slice(0, 4).some(field => typeof row[field] !== 'string') ||
        typeof row.plannedStop !== 'boolean') return null;
    values.push(row);
  }
  return values;
}

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}

export function formatMinor(minor) {
  if (typeof minor !== 'bigint' || minor < 0n) throw new TypeError('INVALID_MINOR');
  return `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`;
}

function summary(rows) {
  const annualMinor = rows.reduce((total, row) => total + row.annualMinor, 0n);
  return {
    rowCount: rows.length,
    annualMinor,
    monthlyMinor: (annualMinor + 6n) / 12n,
    monthlyApproximate: annualMinor % 12n !== 0n
  };
}

export function calculateBudget(request) {
  let root;
  let rows;
  try {
    root = exactRecord(request, ROOT_FIELDS);
    if (!root || typeof root.currencyRaw !== 'string') return failure('INVALID_REQUEST');
    rows = exactRows(root.rows);
    if (!rows) return failure('INVALID_REQUEST');
  } catch {
    return failure('INVALID_REQUEST');
  }
  if (root.currencyRaw.length > 12 || !/^[A-Z]{1,12}$/.test(root.currencyRaw)) {
    return failure('INVALID_CURRENCY', null, 'currencyRaw');
  }
  if (rows.length === 0) return failure('TOO_FEW_ROWS', null, 'rows');
  if (rows.length > 60) return failure('TOO_MANY_ROWS', null, 'rows');
  const ids = new Set();
  const calculated = [];
  for (let index = 0; index < rows.length; index += 1) {
    const input = rows[index];
    const row = index + 1;
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(input.id)) return failure('INVALID_ID', row, 'id');
    if (ids.has(input.id)) return failure('DUPLICATE_ID', row, 'id');
    ids.add(input.id);
    if (input.nameRaw.length > 256) return failure('NAME_RAW_TOO_LONG', row, 'nameRaw');
    if (input.amountRaw.length > 16) return failure('AMOUNT_RAW_TOO_LONG', row, 'amountRaw');
    if (/[\u0000-\u001f\u007f-\u009f]/.test(input.nameRaw) || hasUnpairedSurrogate(input.nameRaw)) {
      return failure('INVALID_NAME', row, 'nameRaw');
    }
    const name = input.nameRaw.trim();
    if (name.length === 0) return failure('NAME_REQUIRED', row, 'nameRaw');
    if (name.length > 80) return failure('NAME_TOO_LONG', row, 'nameRaw');
    if (!Object.hasOwn(MULTIPLIER, input.period)) return failure('INVALID_PERIOD', row, 'period');
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(input.amountRaw)) return failure('INVALID_AMOUNT', row, 'amountRaw');
    const [integer, fraction = ''] = input.amountRaw.split('.');
    const amountMinor = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
    if (amountMinor > 100000000n) return failure('AMOUNT_OUT_OF_RANGE', row, 'amountRaw');
    const annualMinor = amountMinor * MULTIPLIER[input.period];
    calculated.push({
      id: input.id, name, amountText: formatMinor(amountMinor), period: input.period,
      plannedStop: input.plannedStop, annualMinor,
      monthlyMinor: (annualMinor + 6n) / 12n,
      monthlyApproximate: annualMinor % 12n !== 0n
    });
  }
  return { ok: true, value: {
    currency: root.currencyRaw,
    rows: calculated,
    current: summary(calculated),
    plannedStop: summary(calculated.filter(row => row.plannedStop)),
    retained: summary(calculated.filter(row => !row.plannedStop))
  } };
}

const REPORT = Object.freeze({
  'zh-Hant': {
    title: '訂閱費用盤點', currency: '幣別', rows: '訂閱明細',
    each: '每次', annual: '全年', monthly: '平均每月', approx: '約',
    periods: { monthly: '每月', quarterly: '每季', yearly: '每年' },
    stop: '計畫停用', keep: '保留', current: '目前', count: () => '項',
    assumptions: [
      '計算假設：月繳 × 12、季繳 × 4、年繳 × 1；平均每月為全年金額 ÷ 12。',
      '先精確加總全年金額，再將月均四捨五入到分；「約」表示月均經捨入。逐列月均相加可能與總結相差數分；停用與保留月均相加則可能與目前月均相差 0.01。',
      '依固定費率全年化；不含退款、稅、調價或取消費用。這不是今年實際帳單。',
      '計畫停用只是試算，預計全年差額為勾選列全年合計；不會取消服務，也不保證實際節省。',
      '所有金額須為同幣別；幣別標籤不會換匯。'
    ]
  },
  en: {
    title: 'Subscription budget', currency: 'Currency', rows: 'Subscription details',
    each: 'Per payment', annual: 'Annual', monthly: 'Monthly average', approx: 'approx.',
    periods: { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' },
    stop: 'Planned stop', keep: 'Retained', current: 'Current', count: number => number === 1 ? 'item' : 'items',
    assumptions: [
      'Assumptions: monthly × 12, quarterly × 4, yearly × 1; monthly average = annual amount ÷ 12.',
      'Exact annual amounts are summed before monthly averages are rounded half up to cents. “approx.” marks a rounded average. Row averages may differ from the total by a few cents; planned-stop and retained averages may differ from the current average by 0.01.',
      'Annualized at fixed rates; excludes refunds, taxes, price changes and cancellation fees. This is not an actual bill for this year.',
      'Planned stops are a scenario only. The estimated annual reduction is the selected rows’ annual total. No services are cancelled and actual savings are not guaranteed.',
      'All amounts must use one currency; the currency label does not convert money.'
    ]
  }
});

export function reportBudget(value, lang) {
  if (!Object.hasOwn(REPORT, lang)) throw new TypeError('INVALID_LANGUAGE');
  const t = REPORT[lang];
  const monthly = item => `${item.monthlyApproximate ? `${t.approx} ` : ''}${formatMinor(item.monthlyMinor)}`;
  const lines = [t.title, `${t.currency}: ${value.currency}`, '', t.rows];
  for (const [index, row] of value.rows.entries()) {
    lines.push(`${index + 1}. ${row.name} | ${t.each}: ${row.amountText} | ${t.periods[row.period]} | ${t.annual}: ${formatMinor(row.annualMinor)} | ${t.monthly}: ${monthly(row)} | ${row.plannedStop ? t.stop : t.keep}`);
  }
  lines.push('');
  for (const [key, label] of [['current', t.current], ['plannedStop', t.stop], ['retained', t.keep]]) {
    const item = value[key];
    lines.push(`${label} (${item.rowCount} ${t.count(item.rowCount)}) | ${t.annual}: ${formatMinor(item.annualMinor)} | ${t.monthly}: ${monthly(item)}`);
  }
  lines.push('', ...t.assumptions);
  return lines.join('\n');
}
