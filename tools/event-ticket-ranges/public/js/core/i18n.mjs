// Bilingual UI strings for Event Ticket Range Check. Pure data module:
// no DOM / network / storage access. The app picks strings by the page
// language ("zh-Hant" or "en").

const STRINGS = {
  "zh-Hant": {
    statusEmpty: "尚未輸入。請填寫印刷位數與發放號段，再加入票疊。",
    statusDirty: "草稿已更改，結果已失效。按下「核對票號區間」重新核對。",
    statusBusy: "計算中…",
    statusReady: "核對完成。",
    statusReadyNoSolution: "核對完成。",
    statusError: "輸入有問題，請依下方說明修正。",
    arrange: "核對票號區間",
    working: "計算中",
    cancel: "取消",
    clearDraft: "清除草稿",
    loadSample: "載入範例",
    sampleNote:
      "範例是固定的假資料（發放 0001–0010，三疊 A、B、C），用來示範核對；載入後仍需按「核對票號區間」才會計算。",
    workerFallback: "",
    reload: "重新載入",
    initFailed: "頁面初始化失敗。",
    check: "核對票號區間",
    codeLabel: "代碼",
    pathLabel: "位置",
    errorFix: "如何修正",
    goToField: "前往該欄位",
    errors: {
      SIZE: "輸入太大，超過 65,536 位元組上限。請減少票疊數量再試。",
      SHAPE:
        "輸入的欄位組合不正確（多了不明的欄位，或少了必填欄位）。請重新填寫表單。",
      TYPE: "這個欄位的型別不正確。請依欄位提示重新輸入。",
      RANGE: "這個欄位的數值超出允許範圍。請依欄位提示重新輸入。",
      SYNTAX:
        "票號格式不正確：請用純數字，位數要和印刷位數一致，包含前導零，不加空白或符號。",
      ORDER: "末號小於首號，區間是倒序。請把首尾調成首號小於等於末號。",
      DUPLICATE: "有兩疊用了相同的短名。請把重複的短名改成不同的名稱。",
      ENUM: "這個欄位的值不在允許的選項內。",
      REF: "參照的名稱不存在。請檢查輸入的名稱是否正確。",
    },
    summaryHeading: "總覽",
    uniqueCoveredLabel: "已覆蓋",
    missingCountLabel: "缺號",
    duplicateCopiesLabel: "重複張",
    outsideCopiesLabel: "超段張",
    copiesUnit: "張",
    missingHeading: "缺號區間",
    missingNone: "沒有缺號，發放號段已全部覆蓋。",
    missingHint: "最早缺段在最上方；請按缺段翻找對應紙疊補點。",
    overlapsHeading: "重複區間",
    overlapsNone: "沒有重複的票號。",
    overlapsHint: "每段列出重複的票疊，照輸入順序排列；請按票疊重數再點一次。",
    outsideHeading: "超出發放段",
    outsideNone: "沒有超出發放段的票號。",
    outsideHint: "超出發放段的票單獨列在這裡，依票疊輸入順序、同一疊低段先於高段。",
    rangeFirstLabel: "起號",
    rangeLastLabel: "末號",
    rangeCountLabel: "張數",
    bundlesLabel: "票疊",
    bundleLabel: "票疊",
    issuedLengthLabel: "發放總數",
    bundleNameLabel: "票疊短名",
    bundleFirstLabel: "首號",
    bundleLastLabel: "末號",
    removeRow: "移除此疊",
    noSolutionTitle: "沒有可顯示的結果",
    noSolutionBody: "輸入有效，但沒有產生結果。請檢查發放號段與票疊是否正確。",
  },
  en: {
    statusEmpty:
      "Nothing entered yet. Fill in the printed digit count and the issued range, then add ticket stacks.",
    statusDirty:
      "The draft changed and the result is no longer valid. Press “Check ticket ranges” to check again.",
    statusBusy: "Working…",
    statusReady: "Check complete.",
    statusReadyNoSolution: "Check complete.",
    statusError: "There is a problem with the input. Follow the notes below to fix it.",
    arrange: "Check ticket ranges",
    working: "Working",
    cancel: "Cancel",
    clearDraft: "Clear draft",
    loadSample: "Load sample",
    sampleNote:
      "The sample is fixed placeholder data (issued 0001–0010, stacks A, B and C) for demonstration; press “Check ticket ranges” after loading to compute.",
    workerFallback: "",
    reload: "Reload",
    initFailed: "The page failed to start.",
    check: "Check ticket ranges",
    codeLabel: "Code",
    pathLabel: "Location",
    errorFix: "How to fix",
    goToField: "Go to the field",
    errors: {
      SIZE: "The input is too large, over the 65,536-byte limit. Remove some stacks and try again.",
      SHAPE:
        "The field combination is wrong (an unknown field, or a missing required field). Please fill in the form again.",
      TYPE: "This field has the wrong type. Please re-enter it following the field hint.",
      RANGE: "This field is outside its allowed range. Please re-enter it following the field hint.",
      SYNTAX:
        "Ticket number format is wrong: use digits only, exactly as many digits as printed, including leading zeros, with no spaces or symbols.",
      ORDER:
        "The last number is smaller than the first, so the range is backwards. Make the first number less than or equal to the last.",
      DUPLICATE:
        "Two stacks share the same short name. Rename the duplicate stack.",
      ENUM: "This field value is not one of the allowed options.",
      REF: "The referenced name does not exist. Check that the name is correct.",
    },
    summaryHeading: "Summary",
    uniqueCoveredLabel: "Covered",
    missingCountLabel: "Missing",
    duplicateCopiesLabel: "Duplicate copies",
    outsideCopiesLabel: "Outside copies",
    copiesUnit: "tickets",
    missingHeading: "Missing ranges",
    missingNone: "No missing numbers; the issued range is fully covered.",
    missingHint:
      "The earliest missing range is listed first; check the matching paper stacks to fill the gap.",
    overlapsHeading: "Overlapping ranges",
    overlapsNone: "No ticket number appears twice.",
    overlapsHint:
      "Each range lists the stacks that repeat it, in input order; count those stacks again.",
    outsideHeading: "Outside the issued range",
    outsideNone: "No ticket is outside the issued range.",
    outsideHint:
      "Tickets outside the issued range are listed here, in stack input order, lower ranges before higher ones within a stack.",
    rangeFirstLabel: "First",
    rangeLastLabel: "Last",
    rangeCountLabel: "Count",
    bundlesLabel: "Stacks",
    bundleLabel: "Stack",
    issuedLengthLabel: "Issued total",
    bundleNameLabel: "Stack name",
    bundleFirstLabel: "First",
    bundleLastLabel: "Last",
    removeRow: "Remove this stack",
    noSolutionTitle: "No result to show",
    noSolutionBody:
      "The input is valid but produced no result. Check the issued range and the stacks.",
  },
};

export function stringsFor(lang) {
  return STRINGS[lang] === undefined ? STRINGS.en : STRINGS[lang];
}
