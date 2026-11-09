import { inspectObject, inspectItems, parseLabel, fail } from './schema.mjs';
import { derive } from './calculate.mjs';

const RESULT_KEYS = ['schemaVersion', 'assumptions', 'items'];
const ASSUMPTION_KEYS = ['observationDays', 'leadDays', 'coverageDays', 'arrivalTiming', 'usageModel'];
const INPUT_KEYS = ['id', 'name', 'unit', 'observedUseUnits', 'currentStockUnits', 'safetyReserveUnits', 'packSizeUnits'];
const DERIVED_KEYS = ['averageDailyUse', 'targetNumeratorUnitDays', 'stockNumeratorUnitDays', 'needNumeratorUnitDays', 'packDenominatorUnitDays', 'packsToOrder', 'orderUnits', 'shortageNumeratorUnitDays', 'shortageBeforeArrivalUnits', 'runwayWholeDays'];
const AVERAGE_KEYS = ['numeratorUnits', 'denominatorDays', 'roundedTo3'];
const integerIn = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;

function validateResult(result) {
  const root = inspectObject(result, RESULT_KEYS, 'RESULT', 'result');
  if (!root.ok || root.values.schemaVersion !== 1) return null;
  const assumptions = inspectObject(root.values.assumptions, ASSUMPTION_KEYS, 'RESULT', 'result.assumptions');
  if (!assumptions.ok) return null;
  const a = assumptions.values;
  if (!integerIn(a.observationDays, 1, 365) || !integerIn(a.leadDays, 0, 365) || !integerIn(a.coverageDays, 1, 365) || a.arrivalTiming !== 'end-of-lead-period' || a.usageModel !== 'fixed-average') return null;
  const array = inspectItems(root.values.items);
  if (!array.ok) return null;
  const rows = [];
  const ids = new Set();
  for (const value of array.values) {
    const inspected = inspectObject(value, [...INPUT_KEYS, ...DERIVED_KEYS], 'RESULT', 'result.items');
    if (!inspected.ok) return null;
    const row = inspected.values;
    if (typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(row.id) || ids.has(row.id)) return null;
    ids.add(row.id);
    for (const [key, prefix] of [['name', 'NAME'], ['unit', 'UNIT']]) {
      const label = parseLabel(row[key], prefix, key);
      if (!label.ok || label.value !== row[key]) return null;
    }
    const quantities = INPUT_KEYS.slice(3).map(key => row[key]);
    if (quantities.some((value, i) => !integerIn(value, i === 3 ? 1 : 0, i === 3 ? 10000 : 1000000))) return null;
    const average = inspectObject(row.averageDailyUse, AVERAGE_KEYS, 'RESULT', 'average');
    if (!average.ok) return null;
    const expected = derive([a.observationDays, a.leadDays, a.coverageDays].map(BigInt), quantities.map(BigInt));
    for (const key of AVERAGE_KEYS) if (average.values[key] !== expected.averageDailyUse[key]) return null;
    for (const key of DERIVED_KEYS.slice(1)) {
      if (row[key] !== expected[key]) return null;
      if (row[key] !== null && !integerIn(row[key], 0, Number.MAX_SAFE_INTEGER)) return null;
    }
    rows.push(row);
  }
  return { assumptions: a, items: rows };
}

export function formatRestockReport(result, language) {
  if (language !== 'zh-Hant' && language !== 'en') return fail('REPORT_INPUT', 'language');
  const parsed = validateResult(result);
  if (!parsed) return fail('REPORT_INPUT', 'result');
  const { assumptions: a, items } = parsed;
  const zh = language === 'zh-Hant';
  const lines = zh ? [
    '補貨數量試算',
    '估算假設：以觀測期間平均用量固定計算；訂單在到貨天數結束時可用。',
    `觀測期間：${a.observationDays} 天；到貨天數：${a.leadDays} 天；到貨後目標涵蓋：${a.coverageDays} 天。`,
  ] : [
    'Restock quantity plan',
    'Estimate: usage stays at the observed average; the order is available at the end of the lead period.',
    `Observation: ${a.observationDays} days; lead time: ${a.leadDays} days; desired coverage after arrival: ${a.coverageDays} days.`,
  ];
  items.forEach((row, i) => {
    const u = row.unit;
    lines.push('', `${i + 1}. ${row.name}`);
    if (zh) lines.push(
      `單位：${u}；觀測用量：${row.observedUseUnits} ${u}；現貨：${row.currentStockUnits} ${u}；安全備量：${row.safetyReserveUnits} ${u}；每包含：${row.packSizeUnits} ${u}`,
      `平均每日用量：${row.averageDailyUse.roundedTo3} ${u}/日；現貨可用：${row.runwayWholeDays === null ? '無法估算（觀測用量為 0）' : `${row.runwayWholeDays} 整天`}`,
      `到貨前估計短缺：${row.shortageBeforeArrivalUnits} ${u}`,
      `建議補貨：${row.packsToOrder} 包（共 ${row.orderUnits} ${u}）`,
    );
    else lines.push(
      `Unit: ${u}; observed use: ${row.observedUseUnits} ${u}; current stock: ${row.currentStockUnits} ${u}; safety reserve: ${row.safetyReserveUnits} ${u}; units per pack: ${row.packSizeUnits} ${u}`,
      `Average daily use: ${row.averageDailyUse.roundedTo3} ${u}/day; current stock runway: ${row.runwayWholeDays === null ? 'Not estimated (zero observed use)' : `${row.runwayWholeDays} whole days`}`,
      `Estimated shortage before arrival: ${row.shortageBeforeArrivalUnits} ${u}`,
      `Order: ${row.packsToOrder} packs (${row.orderUnits} ${u})`,
    );
  });
  return { ok: true, text: lines.join('\n') };
}
