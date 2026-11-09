// Bilingual strings for Knit Gauge Pattern Planner. Pure data plus
// the display formatter for already-computed tenths of a millimetre
// (Intl.NumberFormat only formats values the core computed). No DOM /
// network / storage access.

export const FIELD_LABELS = {
  "zh-Hant": {
    swatchStitches: "試片針數",
    swatchWidthMm: "試片寬",
    swatchRows: "試片行數",
    swatchHeightMm: "試片高",
    targetWidthMm: "目標寬",
    targetHeightMm: "目標高",
    edgeEach: "每側邊針",
    repeatStitches: "橫向針重複",
    repeatRows: "縱向行重複",
  },
  en: {
    swatchStitches: "Swatch stitches",
    swatchWidthMm: "Swatch width",
    swatchRows: "Swatch rows",
    swatchHeightMm: "Swatch height",
    targetWidthMm: "Target width",
    targetHeightMm: "Target height",
    edgeEach: "Edge stitches per side",
    repeatStitches: "Stitch repeat",
    repeatRows: "Row repeat",
  },
};

const STRINGS = {
  "zh-Hant": {
    intro:
      "先輸入試片的針數、行數與量到的寬高，再輸入目標寬高、每側邊針與圖樣重複；按下「找出可行針數與行數」，就看到目標兩側最近的可行整針與整行。",
    swatchLegend: "試片",
    swatchHelp: "在同一塊矩形試片上數針數與行數，並量它的寬與高。",
    targetLegend: "目標與圖樣",
    targetHelp: "目標是想做出的成品寬高。圖樣沒有限制時，重複填 1。",
    unitStitches: "針",
    unitRows: "行",
    unitMm: "mm",
    rangeStitches: "1–1000 針",
    rangeWidthMm: "1–5000 mm",
    rangeRows: "1–1000 行",
    rangeHeightMm: "1–5000 mm",
    rangeTargetMm: "1–10000 mm",
    rangeEdge: "0–200 針",
    rangeRepeat: "1–200",
    defaultNote: "預設",
    submit: "找出可行針數與行數",
    cancel: "取消",
    clearDraft: "清除草稿",
    loadSample: "載入範例",
    sampleNote:
      "範例是固定的假資料（每針約 5 mm，兩側各 2 針、橫向重複 6）；載入後仍需按「找出可行針數與行數」才會計算。",
    langNote: "切換語言會離開本頁，正在編輯的草稿不會保留。",
    statusEmpty: "尚未輸入。請填寫試片與目標欄位。",
    statusDirty: "草稿已變更，請按「找出可行針數與行數」重新計算。",
    statusBusy: "計算中…",
    statusReady: "已找到可行針數與行數。",
    statusError: "輸入有誤，請依下方說明修正。",
    resultsHeading: "可行針數與行數",
    stitchesHeading: "針數（寬）",
    rowsHeading: "行數（高）",
    optionColumn: "選項",
    countColumn: "數量",
    sizeColumn: "估計尺寸",
    lowerLabel: "較小",
    upperLabel: "較大",
    chosenBadge: "★ 最近",
    exactNote: "恰等於目標寬高，較小與較大是同一組數字。",
    minOnlyNote: "最小可行數已經大於目標，只有較大一側。",
    capOnlyNote: "已到 10,000 針／行的上限，只有較小一側。",
    errorFix: "修正方法",
    codeLabel: "代碼",
    pathLabel: "欄位",
    goToField: "移到該欄位",
    reload: "重新載入",
    initFailed: "頁面初始化失敗，請重新載入。",
    errors: {
      SYNTAX: "請輸入不含空白、前導零、小數或符號的整數。",
      TYPE: "欄位必須是整數。",
      RANGE: "超出允許範圍，請依欄位旁的範圍填寫。",
      SHAPE: "輸入欄位不完整或有多餘欄位。",
      SIZE: "輸入過大（上限 65,536 位元組）。",
      ENUM: "不在允許的選項內。",
      DUPLICATE: "有重複的名稱。",
      REF: "參照的項目不存在。",
    },
  },
  en: {
    intro:
      "Enter the stitches, rows and measured width and height of your swatch, then the target width and height, edge stitches per side and pattern repeats; press “Find stitch and row counts” to see the nearest compatible whole stitch and row totals on each side of the target.",
    swatchLegend: "Swatch",
    swatchHelp:
      "Count the stitches and rows on one rectangular swatch and measure its width and height.",
    targetLegend: "Target and pattern",
    targetHelp:
      "The target is the finished width and height you want. Use 1 for a repeat with no restriction.",
    unitStitches: "sts",
    unitRows: "rows",
    unitMm: "mm",
    rangeStitches: "1–1000 sts",
    rangeWidthMm: "1–5000 mm",
    rangeRows: "1–1000 rows",
    rangeHeightMm: "1–5000 mm",
    rangeTargetMm: "1–10000 mm",
    rangeEdge: "0–200 sts",
    rangeRepeat: "1–200",
    defaultNote: "Default",
    submit: "Find stitch and row counts",
    cancel: "Cancel",
    clearDraft: "Clear draft",
    loadSample: "Load sample",
    sampleNote:
      "The sample is fixed placeholder data (about 5 mm per stitch, 2 edge stitches per side, stitch repeat 6); press “Find stitch and row counts” after loading to calculate.",
    langNote: "Switching languages leaves this page; your draft will not be kept.",
    statusEmpty: "Nothing entered yet. Fill in the swatch and target fields.",
    statusDirty:
      "Draft changed. Press “Find stitch and row counts” to calculate again.",
    statusBusy: "Working…",
    statusReady: "Compatible stitch and row counts found.",
    statusError: "There is a problem with the input. See below to fix it.",
    resultsHeading: "Compatible stitch and row counts",
    stitchesHeading: "Stitches (width)",
    rowsHeading: "Rows (height)",
    optionColumn: "Option",
    countColumn: "Count",
    sizeColumn: "Estimated size",
    lowerLabel: "Smaller",
    upperLabel: "Larger",
    chosenBadge: "★ Closest",
    exactNote: "Exactly on target; the smaller and larger options are the same.",
    minOnlyNote: "The smallest compatible count is already above the target, so only the larger side exists.",
    capOnlyNote: "At the 10,000 stitch / row cap, so only the smaller side exists.",
    errorFix: "How to fix",
    codeLabel: "Code",
    pathLabel: "Field",
    goToField: "Go to field",
    reload: "Reload",
    initFailed: "The page failed to start. Please reload.",
    errors: {
      SYNTAX: "Enter an integer with no spaces, leading zeros, decimals or signs.",
      TYPE: "The field must be an integer.",
      RANGE: "Out of the allowed range; see the range shown next to the field.",
      SHAPE: "The input is missing fields or has extra fields.",
      SIZE: "Input is too large (limit 65,536 bytes).",
      ENUM: "Not one of the allowed options.",
      DUPLICATE: "A name is duplicated.",
      REF: "The referenced item does not exist.",
    },
  },
};

export function stringsFor(lang) {
  return STRINGS[lang] ?? STRINGS.en;
}

export function fieldLabel(lang, key) {
  return (FIELD_LABELS[lang] ?? FIELD_LABELS.en)[key] ?? key;
}

// Format already-computed tenths of a millimetre with one decimal.
export function formatMm(sizeTenthsMm, lang) {
  const locale = lang === "zh-Hant" ? "zh-Hant" : "en";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(sizeTenthsMm / 10);
}
