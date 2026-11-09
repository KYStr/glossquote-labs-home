// Dynamic UI strings for both language pages. Static copy lives in the
// HTML files; everything the controller writes at runtime comes from
// here so the two pages stay equivalent. Key sets MUST match exactly
// (enforced by scripts/check.mjs).

export const STRINGS = {
  "zh-Hant": {
    basisOk: (sum) => `麵粉合計 ${sum}% — 正確，麵粉百分比合計必須是 100%。`,
    basisBad: (sum) =>
      `麵粉合計目前是 ${sum}%。麵粉百分比必須合計正好 100%，輸出已凍結並標記為過期，不會自動調整比例。`,
    basisModeC: (flour) => `麵粉總重 ${flour} g — 百分比以全部麵粉重量為基準計算。`,
    staleBadge: "已過期（輸入有誤，以下是最後一次正確結果）",
    errFlagConflict: "同一列不能同時勾選麵粉和水。",
    errPercentFormat: "百分比請輸入 0 到 1000、最多一位小數的數字。",
    errPercentRange: "百分比必須介於 0 到 1000 之間。",
    errWeightFormat: "重量請輸入 0 到 100,000、最多一位小數的數字（克）。",
    errWeightRange: "重量必須介於指定範圍內（克）。",
    errTargetRange: "目標重量必須介於 1 到 100,000 克之間。",
    errNoFlour: "至少要有一列勾選為麵粉，輸出才會恢復。",
    errFlourZero: "麵粉總重是 0，無法計算百分比。請先輸入麵粉重量。",
    errTooMany: "最多 30 列材料。",
    rowLimitNote: "已達 30 列上限，不能再新增。",
    modeCNote:
      "已切換到重量模式：欄位中的數字是目前顯示的克數（經過 0.1 克四捨五入的值，已成為輸入）。切換回去時會用這些重量重新計算百分比。",
    removeRow: "刪除這一列",
    nameLabel: "材料名稱",
    defaultNames: ["高筋麵粉", "水", "鹽", "酵母"],
    resultWeightHeader: "重量（克）",
    resultPercentHeader: "百分比（%）",
  },
  en: {
    basisOk: (sum) => `Flour total ${sum}% — correct: flour percentages must total 100%.`,
    basisBad: (sum) =>
      `Flour percentages currently total ${sum}%. They must total exactly 100%; outputs are frozen and marked out of date, and the formula is never renormalised for you.`,
    basisModeC: (flour) => `Total flour weight ${flour} g — percentages are computed against the combined flour weight.`,
    staleBadge: "Out of date (the inputs have an error; showing the last valid result)",
    errFlagConflict: "A row cannot be flagged as both flour and water.",
    errPercentFormat: "Enter a percentage from 0 to 1000 with at most one decimal place.",
    errPercentRange: "Percentage must be between 0 and 1000.",
    errWeightFormat: "Enter a weight from 0 to 100,000 with at most one decimal place (grams).",
    errWeightRange: "Weight must be within the allowed range (grams).",
    errTargetRange: "The target weight must be between 1 and 100,000 g.",
    errNoFlour: "At least one row must be flagged as flour before outputs resume.",
    errFlourZero: "Total flour weight is 0, so percentages cannot be computed. Enter a flour weight first.",
    errTooMany: "At most 30 ingredient rows.",
    rowLimitNote: "The 30-row limit is reached; no more rows can be added.",
    modeCNote:
      "Switched to weight mode: the numbers in the column are the currently displayed weights (rounded to 0.1 g, now acting as inputs). Switching back recomputes the percentages from these weights.",
    removeRow: "Remove this row",
    nameLabel: "Ingredient name",
    defaultNames: ["Bread flour", "Water", "Salt", "Yeast"],
    resultWeightHeader: "Weight (g)",
    resultPercentHeader: "Percentage (%)",
  },
};

export function stringsFor(lang) {
  return STRINGS[lang] ?? STRINGS.en;
}
