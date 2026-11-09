// Localised UI strings (zh-Hant / en). No user content is ever
// interpolated into HTML; placeholders are filled via textContent.

export const STRINGS = {
  'zh-Hant': {
    statusEmpty: '尚未建立案例。請輸入維度或載入範例。',
    statusDirty: '輸入已變更，請重新執行。',
    statusBusy: '處理中…',
    statusCancelled: '已取消，可重新執行。',
    summary: (cases, pairs, space) =>
      `共 ${cases} 個案例，覆蓋 ${pairs} 個配對（母集合 ${space} 種組合）。`,
    greedyNote: '此為依新增覆蓋挑選的可重現案例集合，不保證案例最少，也沒有執行測試。',
    exampleLoaded: '已載入範例，請按「建立兩兩覆蓋表」執行。',
    pageLabel: (page, pages) => `第 ${page} / ${pages} 頁`,
    prevPage: '上一頁',
    nextPage: '下一頁',
    caseCol: '案例',
    gainCol: '新增配對數',
    errorLabel: '錯誤',
    errors: {
      SCHEMA: '輸入格式不正確，請重新輸入。',
      INPUT_LIMIT: '輸入超過 1,024 個字元上限。',
      EMPTY: '請輸入測試維度。',
      ROW_LIMIT: '維度最多 5 列。',
      DIMENSION_COUNT: '至少需要 2 個維度。',
      DIMENSION: (row) => `第 ${row} 列格式不正確，應為 name:a|b。`,
      VALUE_COUNT: (row) => `第 ${row} 列每個維度需要 2–6 個值。`,
      DUP_KEY: (row) => `第 ${row} 列的維度名稱重複。`,
      DUP_VALUE: (row) => `第 ${row} 列有重複的值。`,
      PRODUCT_LIMIT: '維度值數乘積超過 2,048。',
      UNICODE: '輸入含有不成對的代理字元（surrogate）。',
      INTERNAL: '內部錯誤，請重試。',
      WORKER_ERROR: '背景計算無法啟動，請重試。',
      OUTPUT_LIMIT: '報告超過 2,097,152 bytes 上限。',
    },
  },
  en: {
    statusEmpty: 'No cases yet. Enter dimensions or load the example.',
    statusDirty: 'Input changed. Run again.',
    statusBusy: 'Working…',
    statusCancelled: 'Cancelled. You can run again.',
    summary: (cases, pairs, space) =>
      `${cases} cases covering ${pairs} pairs (search space: ${space} combinations).`,
    greedyNote: 'This is a reproducible set selected by newly covered pairs. It does not guarantee the fewest cases, and no tests were executed.',
    exampleLoaded: 'Example loaded. Press “Build pairwise cases” to run it.',
    pageLabel: (page, pages) => `Page ${page} of ${pages}`,
    prevPage: 'Previous page',
    nextPage: 'Next page',
    caseCol: 'Case',
    gainCol: 'Newly covered pairs',
    errorLabel: 'Error',
    errors: {
      SCHEMA: 'The input is malformed. Please try again.',
      INPUT_LIMIT: 'Input exceeds the 1,024-character limit.',
      EMPTY: 'Enter the test dimensions.',
      ROW_LIMIT: 'At most 5 dimensions.',
      DIMENSION_COUNT: 'At least 2 dimensions are required.',
      DIMENSION: (row) => `Line ${row} is not in name:a|b format.`,
      VALUE_COUNT: (row) => `Line ${row} needs 2–6 values per dimension.`,
      DUP_KEY: (row) => `Line ${row} repeats a dimension name.`,
      DUP_VALUE: (row) => `Line ${row} has a duplicate value.`,
      PRODUCT_LIMIT: 'The product of value counts exceeds 2,048.',
      UNICODE: 'Input contains an unpaired surrogate.',
      INTERNAL: 'Internal error. Please try again.',
      WORKER_ERROR: 'Background computation could not start. Please try again.',
      OUTPUT_LIMIT: 'The report exceeds the 2,097,152-byte limit.',
    },
  },
};

export function errorMessage(strings, error) {
  if (!error) return '';
  const entry = strings.errors[error.code];
  if (typeof entry === 'function') return entry(error.row);
  if (typeof entry === 'string') return entry;
  return strings.errors.INTERNAL;
}
