// Bilingual strings for Film Roll Frame Budget. The page language
// (the html element's lang attribute) selects the set; both sets carry the
// same keys. Numbers are formatted with Intl.NumberFormat after the core
// has computed them; no user text is ever interpolated as HTML.

const STRINGS = {
  "zh-Hant": {
    statusEmpty: "尚未輸入。填好剩餘張數與場景，按「配置剩餘張數」開始。",
    statusDirty: "草稿已變更，結果已清除。按「配置剩餘張數」重新計算。",
    statusBusy: "計算中…",
    statusError: "輸入有誤，請依下方說明修正後再送出。",
    statusReady: "已配置完成。檢查每列的已配置與未達理想數。",
    statusReadyDeficit: "最低張數不足：先看差額，再調整最低或保留額。",
    arrange: "配置剩餘張數",
    working: "計算中",
    cancel: "取消",
    clearDraft: "清除草稿",
    loadSample: "載入範例",
    addScene: "新增一場景",
    removeRow: "移除",
    remainingLabel: "剩餘張數",
    reserveLabel: "臨時保留張數",
    sceneNameLabel: "場景短名",
    minLabel: "最低張數",
    wantedLabel: "理想張數",
    priorityLabel: "優先級",
    priorityNames: { 3: "最重要", 2: "一般", 1: "可略過" },
    resultHeading: "逐場景分配",
    deficitHeading: "最低張數不足",
    colScene: "場景",
    colPlanned: "已配置",
    colUnmet: "未達理想",
    availableLabel: "可拍張數",
    reserveSummaryLabel: "保留張數",
    spareLabel: "未用張數",
    deficitLabel: "最低差額",
    totalsLine:
      "總計：已配置 {planned} 張 ＋ 保留 {reserve} 張 ＋ 未用 {spare} 張 ＝ 剩餘 {remaining} 張。",
    deficitBody:
      "最低合計 {minSum} 張，比可拍的 {available} 張多 {deficit} 張。本次不做部分分配：請降低某場景的最低張數，或減少臨時保留額，再重新配置。",
    unmetNote: "未達理想的場景仍可先拍已配置的張數；多出的一張會在同級中依輸入順序輪流補上。",
    sampleNote:
      "範例是固定的假資料（24 張剩餘、保留 4 張），用來示範優先級輪流補張；載入後仍需按「配置剩餘張數」才會計算。",
    codeLabel: "代碼",
    pathLabel: "欄位",
    errorFix: "修正方式",
    errorGoTo: "跳到該欄位",
    initFailed: "初始化失敗，請重新載入頁面。",
    reload: "重新載入",
    framesUnit: "張",
    errors: {
      SIZE: "輸入過大：整份輸入超過 65536 個位元組。請減少場景列數或縮短短名。",
      SHAPE:
        "欄位結構不符：有未知或缺少的欄位。請檢查欄位名稱是否與表單一致。",
      TYPE: "欄位型別不符：請輸入整數；短名請輸入文字。",
      RANGE: "數值超出範圍：張數為 0–200、優先級為 1–3、場景 1–16 列、短名 1–24 個字元。",
      DUPLICATE: "場景短名重複：請改用不同的短名。",
      ORDER:
        "順序不符：保留張數不可超過剩餘張數，且每列的理想張數不可低於最低張數。",
      SYNTAX:
        "數字格式不符：只接受 ASCII 十進位整數，不可有空白、前導零、全形數字、小數或正負號。",
    },
  },
  en: {
    statusEmpty:
      "Nothing entered yet. Fill in the remaining frames and scenes, then press “Allocate remaining frames”.",
    statusDirty:
      "Draft changed; the previous result was cleared. Press “Allocate remaining frames” to compute again.",
    statusBusy: "Working…",
    statusError: "There is an input error. Fix it using the note below, then submit again.",
    statusReady:
      "Allocation complete. Check the planned and unmet frames for each scene.",
    statusReadyDeficit:
      "Minimum frames are short: check the deficit, then adjust minimums or the reserve.",
    arrange: "Allocate remaining frames",
    working: "Working",
    cancel: "Cancel",
    clearDraft: "Clear draft",
    loadSample: "Load sample",
    addScene: "Add a scene",
    removeRow: "Remove",
    remainingLabel: "Remaining frames",
    reserveLabel: "Frames held for ad-hoc scenes",
    sceneNameLabel: "Scene short name",
    minLabel: "Minimum frames",
    wantedLabel: "Target frames",
    priorityLabel: "Priority",
    priorityNames: { 3: "Top priority", 2: "Standard", 1: "Optional" },
    resultHeading: "Allocation by scene",
    deficitHeading: "Minimum frames short",
    colScene: "Scene",
    colPlanned: "Planned",
    colUnmet: "Unmet",
    availableLabel: "Frames available",
    reserveSummaryLabel: "Frames held",
    spareLabel: "Frames unused",
    deficitLabel: "Minimum deficit",
    totalsLine:
      "Total: {planned} planned ＋ {reserve} held ＋ {spare} unused ＝ {remaining} remaining.",
    deficitBody:
      "The minimums total {minSum} frames, {deficit} more than the {available} available. No partial allocation is made: lower a scene minimum or reduce the held reserve, then allocate again.",
    unmetNote:
      "Scenes below target can still shoot their planned frames; extra frames go round-robin within a priority, in input order.",
    sampleNote:
      "The sample is fixed dummy data (24 frames remaining, 4 held) showing priority round-robin; press “Allocate remaining frames” to compute it.",
    codeLabel: "Code",
    pathLabel: "Field",
    errorFix: "How to fix",
    errorGoTo: "Go to this field",
    initFailed: "Initialisation failed. Please reload the page.",
    reload: "Reload",
    framesUnit: "frames",
    errors: {
      SIZE: "Input too large: the whole input exceeds 65,536 bytes. Remove scene rows or shorten short names.",
      SHAPE:
        "Field structure mismatch: there is an unknown or missing field. Check the field names against the form.",
      TYPE: "Wrong field type: enter whole numbers; short names must be text.",
      RANGE:
        "Value out of range: frames 0–200, priority 1–3, scenes 1–16 rows, short names 1–24 characters.",
      DUPLICATE: "Duplicate scene short name: use a different short name.",
      ORDER:
        "Order mismatch: the held reserve cannot exceed the remaining frames, and each target cannot be below its minimum.",
      SYNTAX:
        "Number format mismatch: only ASCII decimal integers are accepted — no spaces, leading zeros, full-width digits, decimals or signs.",
    },
  },
};

export function stringsFor(lang) {
  return STRINGS[lang] || STRINGS.en;
}

export function formatNumber(value, lang) {
  return new Intl.NumberFormat(lang === "zh-Hant" ? "zh-Hant" : "en").format(
    value,
  );
}
