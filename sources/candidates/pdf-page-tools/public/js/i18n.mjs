// UI dictionaries for the PDF Page Tools.
// Error messages are keyed by the core/engine error codes; both
// languages carry the same keys (the project check enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      NOT_PDF: "不是 PDF 檔（找不到 %PDF- 標頭）。",
      ENCRYPTED: "這是受密碼保護的 PDF，本工具不解密、不要求密碼。",
      CORRUPT: "檔案損毀或格式不正確，無法開啟。",
      NO_PAGES: "這個 PDF 沒有任何頁面。",
      FILE_TOO_LARGE: "單一檔案上限為 200 MB。",
      TOO_MANY_FILES: "合併最多 20 個檔案。",
      TOTAL_SIZE_EXCEEDED: "合併檔案總大小上限為 200 MB。",
      TOO_MANY_PAGES: "總頁數上限為 2,000 頁。",
      TOO_FEW_FILES: "合併至少需要 2 個有效的 PDF。",
      RANGE_EMPTY: "請輸入頁面範圍。",
      RANGE_EMPTY_ITEM: "範圍中有空白項目（例如連續的逗號）。",
      RANGE_NON_NUMERIC: "範圍項目「{token}」不是有效的頁碼或區間。",
      RANGE_BAD_PAGE: "範圍項目「{token}」的頁碼必須是 1 以上。",
      RANGE_REVERSED: "範圍項目「{token}」的結束頁小於開始頁。",
      RANGE_BEYOND: "範圍項目「{token}」超出了文件的頁數。",
      RANGE_OVERLAP: "分割模式的群組不可重疊：「{token}」與前面的群組重複。",
      RANGE_DUPLICATE: "頁面不可重複選取：「{token}」含有已選的頁面。",
    }),
    ui: Object.freeze({
      FILE_META: "{pages} 頁 · {size}",
      MOVE_UP: "上移",
      MOVE_DOWN: "下移",
      REMOVE: "移除",
      PLAN_MERGE: "合併計畫：{files} 個檔案，共 {pages} 頁 → {name}",
      PLAN_NEED_FILES: "加入至少 {count} 個有效的 PDF 後會顯示計畫。",
      PLAN_SPLIT_COMBINED: "分割計畫：{groups} 組，共 {pages} 頁 → {name}",
      PLAN_SPLIT_PER_GROUP: "分割計畫：{groups} 組，共 {pages} 頁，逐組輸出 {count} 個檔案",
      PLAN_EXTRACT: "擷取計畫：頁面順序 {order} → {name}",
      PLAN_ROTATE: "旋轉計畫：{count} 頁，範例：第 {page} 頁 {from}° → {to}° → {name}",
      PROGRESS: "處理中：{done}/{total}",
      GENERATED: "已產生 {count} 個檔案，耗時 {ms} 毫秒。",
      CLEARED: "已清除全部檔案與結果。",
      ADDED: "已加入 {name}。",
      GENERATE_FAILED: "產生失敗：{message}",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      NOT_PDF: "Not a PDF file (no %PDF- header found).",
      ENCRYPTED: "This PDF is password-protected; this tool does not decrypt or ask for passwords.",
      CORRUPT: "The file is corrupt or malformed and could not be opened.",
      NO_PAGES: "This PDF has no pages.",
      FILE_TOO_LARGE: "The per-file limit is 200 MB.",
      TOO_MANY_FILES: "Merge accepts at most 20 files.",
      TOTAL_SIZE_EXCEEDED: "The merge total size limit is 200 MB.",
      TOO_MANY_PAGES: "The total page limit is 2,000 pages.",
      TOO_FEW_FILES: "Merge needs at least 2 valid PDFs.",
      RANGE_EMPTY: "Enter a page range.",
      RANGE_EMPTY_ITEM: "The range contains an empty item (for example a doubled comma).",
      RANGE_NON_NUMERIC: "Range item \"{token}\" is not a valid page or interval.",
      RANGE_BAD_PAGE: "Range item \"{token}\" uses a page below 1.",
      RANGE_REVERSED: "Range item \"{token}\" ends before it starts.",
      RANGE_BEYOND: "Range item \"{token}\" goes beyond the document's page count.",
      RANGE_OVERLAP: "Split groups must not overlap: \"{token}\" repeats an earlier group.",
      RANGE_DUPLICATE: "Pages must not be selected twice: \"{token}\" contains an already-selected page.",
    }),
    ui: Object.freeze({
      FILE_META: "{pages} pages · {size}",
      MOVE_UP: "Move up",
      MOVE_DOWN: "Move down",
      REMOVE: "Remove",
      PLAN_MERGE: "Merge plan: {files} files, {pages} pages in total → {name}",
      PLAN_NEED_FILES: "Add at least {count} valid PDF(s) to see the plan.",
      PLAN_SPLIT_COMBINED: "Split plan: {groups} group(s), {pages} pages → {name}",
      PLAN_SPLIT_PER_GROUP: "Split plan: {groups} group(s), {pages} pages, one file per group ({count} files)",
      PLAN_EXTRACT: "Extract plan: page order {order} → {name}",
      PLAN_ROTATE: "Rotate plan: {count} page(s); sample: page {page} {from}° → {to}° → {name}",
      PROGRESS: "Working: {done}/{total}",
      GENERATED: "Generated {count} file(s) in {ms} ms.",
      CLEARED: "All files and results cleared.",
      ADDED: "Added {name}.",
      GENERATE_FAILED: "Generation failed: {message}",
    }),
  }),
});

export function translate(lang, code, params = {}) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  const template = dict.errors[code] ?? dict.ui[code] ?? code;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}

export function errorMessage(lang, error) {
  if (error && typeof error.code === "string") {
    return translate(lang, error.code, error.params ?? {});
  }
  return error instanceof Error ? error.message : String(error);
}
