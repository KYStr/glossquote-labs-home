const zh = {
  item: '品項', remove: '移除品項', count: n => `${n} / 30 品項`,
  fields: { nameRaw: '名稱', unitRaw: '單位標籤', usedRaw: '觀測期間總用量', stockRaw: '目前現貨', reserveRaw: '安全備量', packSizeRaw: '每包單位數' },
  help: { nameRaw: '1–80 個字元；單行名稱。', unitRaw: '1–16 個字元；同列數量使用相同單位。', usedRaw: '0–1,000,000；0 為合法值。', stockRaw: '0–1,000,000；不含在途貨。', reserveRaw: '0–1,000,000；另加於目標量。', packSizeRaw: '1–10,000；只採整包。' },
  status: {
    initial: '填好每個品項，再按「試算補貨」。目前尚未計算。',
    changed: '輸入已變更；舊結果已清除。請重新試算。', running: '正在試算補貨…',
    success: '✓ 已完成試算。結果依目前輸入與固定平均耗用假設計算。',
    noOrder: '✓ 目前估算不需要補貨；仍列出到貨前短缺與現貨可用天數。',
    example: '範例已載入，尚未計算。請按「試算補貨」。',
    error: '⚠ 請檢查標示的欄位。其他品項不會先產生部分結果。',
    blocked: '⚠ 此頁無法安全完成試算。請重新載入後再試；資料不會送到其他服務。',
  },
  confirm: {
    language: '切換語言會離開此頁並清除此頁輸入與結果。此工具不會自動保存。要切換嗎？',
    normal: '載入範例會取代目前輸入並清除結果；載入後不會自動試算。要繼續嗎？',
    shortage: '載入範例會取代目前輸入並清除結果；載入後不會自動試算。要繼續嗎？',
    clear: '清除會恢復預設天數和一列空白品項，並清除結果。要清除嗎？',
  },
  confirmAction: { language: '切換語言', normal: '載入範例', shortage: '載入範例', clear: '清除全部' },
  zero: '觀測用量為 0；現貨可用天數無法估算。安全備量仍會計入補貨量。',
  shortage: '⚠ 到貨前可能短缺；本次新訂單不會提前填補這段缺口。',
  resultLabels: { packsToOrder: '建議包數', orderUnits: '建議總單位', shortageBeforeArrivalUnits: '到貨前估計短缺', runwayWholeDays: '現貨可用整天數', observedUseUnits: '觀測總用量', currentStockUnits: '現貨', safetyReserveUnits: '安全備量', packSizeUnits: '每包單位數', averageDailyUse: '平均每日用量' },
  packs: '包', days: '整天', daily: '/日', notEstimated: '無法估算（觀測用量為 0）',
};
const en = {
  item: 'Item', remove: 'Remove item', count: n => `${n} / 30 items`,
  fields: { nameRaw: 'Name', unitRaw: 'Unit label', usedRaw: 'Use during observation', stockRaw: 'Current stock', reserveRaw: 'Safety reserve', packSizeRaw: 'Units per pack' },
  help: { nameRaw: '1–80 characters; one line.', unitRaw: '1–16 characters; one unit for all quantities in this item.', usedRaw: '0–1,000,000; zero is valid.', stockRaw: '0–1,000,000; excludes incoming orders.', reserveRaw: '0–1,000,000; added to the target.', packSizeRaw: '1–10,000; whole packs only.' },
  status: {
    initial: 'Fill in each item, then select “Calculate restock.” Nothing has been calculated yet.',
    changed: 'Inputs changed. The previous result was cleared. Calculate again.', running: 'Calculating restock…',
    success: '✓ Plan calculated from the current inputs using the fixed-average-use assumption.',
    noOrder: '✓ The estimate calls for no new packs. Shortage and stock runway are still shown.',
    example: 'Example loaded. Select “Calculate restock” to calculate it.',
    error: '⚠ Check the marked field. No partial item results were produced.',
    blocked: '⚠ This page cannot safely complete the calculation. Reload and try again; data is not sent to another service.',
  },
  confirm: {
    language: 'Changing language leaves this page and clears its inputs and result. This tool does not save automatically. Continue?',
    normal: 'Loading this example replaces the current inputs and clears the result. It will not calculate automatically. Continue?',
    shortage: 'Loading this example replaces the current inputs and clears the result. It will not calculate automatically. Continue?',
    clear: 'Clear resets the day values and leaves one blank item. The result will be cleared. Continue?',
  },
  confirmAction: { language: 'Change language', normal: 'Load example', shortage: 'Load example', clear: 'Clear all' },
  zero: 'Observed use is zero, so stock runway is not estimated. Safety reserve still affects the order.',
  shortage: '⚠ A shortage may occur before arrival. The new order does not fill this earlier gap.',
  resultLabels: { packsToOrder: 'Packs to order', orderUnits: 'Total units to order', shortageBeforeArrivalUnits: 'Shortage before arrival', runwayWholeDays: 'Current stock runway', observedUseUnits: 'Observed use', currentStockUnits: 'Current stock', safetyReserveUnits: 'Safety reserve', packSizeUnits: 'Units per pack', averageDailyUse: 'Average daily use' },
  packs: 'packs', days: 'whole days', daily: '/day', notEstimated: 'Not estimated (zero observed use)',
};
export const copyFor = language => language === 'en' ? en : zh;

export function errorMessage(code, field, language) {
  const english = language === 'en';
  if (code.startsWith('DAY_')) {
    if (code === 'DAY_RANGE') return english ? `Enter a whole number from ${field === 'leadDaysRaw' ? '0' : '1'} to 365.` : `請輸入 ${field === 'leadDaysRaw' ? '0' : '1'}–365 的整數。`;
    return english ? 'Use 1–16 ASCII digits (0–9), without spaces, signs or decimals.' : '請輸入 1–16 位半形數字（0–9），不含空白、正負號或小數。';
  }
  if (code.startsWith('QUANTITY_')) {
    if (code === 'QUANTITY_RANGE') return english ? (field.endsWith('packSizeRaw') ? 'Enter a whole number from 1 to 10,000.' : 'Enter a whole number from 0 to 1,000,000.') : (field.endsWith('packSizeRaw') ? '請輸入 1–10,000 的整數。' : '請輸入 0–1,000,000 的整數。');
    return english ? 'Use 1–16 ASCII digits (0–9). Empty is not zero; omit signs, spaces and decimals.' : '請輸入 1–16 位半形數字（0–9）；空欄不是 0，不含符號、空白或小數。';
  }
  if (code.startsWith('NAME_') || code.startsWith('UNIT_')) {
    const name = code.startsWith('NAME_');
    if (code.endsWith('_EMPTY')) return english ? `Enter a ${name ? 'name' : 'unit label'}.` : `請填入${name ? '名稱' : '單位標籤'}。`;
    if (code.endsWith('_LIMIT')) return english ? `Use a single-line ${name ? 'name of 1–80 characters (at most 512 before trimming)' : 'unit label of 1–16 characters (at most 128 before trimming)'}.` : `請使用單行${name ? '名稱 1–80 個字元，去除前後空白前最多 512 字元' : '單位標籤 1–16 個字元，去除前後空白前最多 128 字元'}。`;
    return english ? 'Use valid single-line text without control or line-separator characters.' : '請使用完整的單行文字，不含控制字或換行分隔符。';
  }
  return copyFor(language).status.blocked;
}
