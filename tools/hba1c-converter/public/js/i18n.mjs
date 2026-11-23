// Bilingual runtime messages for the HbA1c Converter.
// Static page copy lives in the two HTML files; this table covers only
// strings the app sets at runtime (status, errors, dynamic result text).
// Error wordings are the SPEC inputsOutputs table, verbatim.

export const MESSAGES = {
  'zh-Hant': {
    statusEmpty: '輸入一個數值並選擇單位，再按「換算」。',
    statusDirty: '輸入已變更，請重新執行',
    statusBusy: '處理中',
    statusCancelled: '已取消，可重新執行',
    statusSuccess: '換算完成。',
    error_SCHEMA: '輸入結構不正確，請重新輸入。',
    error_INPUT_LIMIT: '輸入過長。',
    error_EMPTY: '請輸入數值。',
    error_NUMBER_FORMAT: '請輸入數字，最多兩位小數，不含逗號或符號。',
    error_RANGE: '數值超出可換算範圍。',
    error_INTERNAL: '內部錯誤，請重試。',
    error_WORKER_ERROR: '計算失敗，請重試。',
    error_OUTPUT_LIMIT: '報告太大，無法下載。',
    exampleNote: '範例：HbA1c 7%（合成案例，尚未執行）。',
    valueHelp_a1c_percent: 'HbA1c 百分比，3.0–20.0%，最多兩位小數。',
    valueHelp_ifcc: 'HbA1c（IFCC），9.29–195.08 mmol/mol，最多兩位小數。',
    valueHelp_eag_mgdl: '平均血糖（eAG），39.40–527.30 mg/dL，最多兩位小數。',
    valueHelp_eag_mmoll: '平均血糖（eAG），2.19–29.29 mmol/L，最多兩位小數。',
    categoryNormal: '正常',
    categoryPrediabetes: '糖尿病前期',
    categoryDiabetesRange: '糖尿病範圍',
    summary: 'HbA1c {a1c}%・{ifcc} mmol/mol・eAG {mgdl} mg/dL（{mmoll} mmol/L），{category}。',
  },
  en: {
    statusEmpty: 'Enter a value, choose its unit, then choose Convert.',
    statusDirty: 'Input changed. Run again.',
    statusBusy: 'Working',
    statusCancelled: 'Cancelled. You can run again.',
    statusSuccess: 'Conversion complete.',
    error_SCHEMA: 'The input structure is invalid. Please re-enter.',
    error_INPUT_LIMIT: 'Input is too long.',
    error_EMPTY: 'Please enter a value.',
    error_NUMBER_FORMAT: 'Enter a number with up to 2 decimal places, no commas or symbols.',
    error_RANGE: 'The value is outside the convertible range.',
    error_INTERNAL: 'Internal error. Please try again.',
    error_WORKER_ERROR: 'Calculation failed. Please try again.',
    error_OUTPUT_LIMIT: 'The report is too large to download.',
    exampleNote: 'Example: HbA1c 7% (sample data, not run yet).',
    valueHelp_a1c_percent: 'HbA1c percentage, 3.0–20.0%, up to two decimal places.',
    valueHelp_ifcc: 'HbA1c (IFCC), 9.29–195.08 mmol/mol, up to two decimal places.',
    valueHelp_eag_mgdl: 'Estimated average glucose (eAG), 39.40–527.30 mg/dL, up to two decimal places.',
    valueHelp_eag_mmoll: 'Estimated average glucose (eAG), 2.19–29.29 mmol/L, up to two decimal places.',
    categoryNormal: 'Normal',
    categoryPrediabetes: 'Prediabetes',
    categoryDiabetesRange: 'Diabetes range',
    summary: 'HbA1c {a1c}% · {ifcc} mmol/mol · eAG {mgdl} mg/dL ({mmoll} mmol/L), {category}.',
  },
};

export function message(lang, key) {
  const table = MESSAGES[lang] ?? MESSAGES.en;
  return table[key] ?? MESSAGES.en[key] ?? key;
}
