// UI dictionaries for the Markdown Preview tool. Static page copy lives
// in the two HTML pages; this dictionary carries the dynamic strings
// the controller sets (counts, announcements, states) plus the bundled
// sample documents, with zh-Hant / en key parity enforced by the
// project check.

const SAMPLE_ZH = [
  "# 範例文件",
  "",
  "這份範例展示支援的子集：**粗體**、*斜體*、~~刪除線~~、`行內程式碼`，",
  "以及[連結](https://example.com)與清單：",
  "",
  "- [x] 寫草稿",
  "- [ ] 預覽與匯出",
  "",
  "> 提示：所有運算都在你的裝置上完成。",
  "",
  "| 欄位 | 數值 |",
  "|:---|---:|",
  "| 字元 | 200,000 |",
  "",
  "```txt",
  "原始 HTML 會被轉義顯示，不會執行。",
  "```",
].join("\n");

const SAMPLE_EN = [
  "# Sample document",
  "",
  "This sample shows the supported subset: **bold**, *italic*,",
  "~~strikethrough~~, `inline code`, and a [link](https://example.com),",
  "plus a list:",
  "",
  "- [x] Draft",
  "- [ ] Preview and export",
  "",
  "> Note: everything is computed on your device.",
  "",
  "| Field | Value |",
  "|:---|---:|",
  "| Characters | 200,000 |",
  "",
  "```txt",
  "Raw HTML is escaped and shown, never executed.",
  "```",
].join("\n");

export const DICTIONARIES = {
  "zh-Hant": {
    ui: {
      COUNTS: "{chars} 字元 · {words} 字",
      LIMIT_ERROR: "文件超過 200,000 字元上限（目前 {chars} 字元），預覽已凍結在上一個有效版本；請縮短內容後再繼續。",
      UPDATED: "預覽已更新。",
      COPIED: "已複製預覽 HTML。",
      CLEARED: "已清除編輯器內容。",
      SAMPLE_CONFIRM: "再按一次以範例取代目前內容",
      SAMPLE_BUTTON: "載入範例",
      SAMPLE_LOADED: "已載入範例文件。",
      DEFAULT_EXPORT_TITLE: "Markdown 文件",
      EMPTY_HINT: "在左側輸入 Markdown，這裡會即時顯示預覽。",
    },
    sample: SAMPLE_ZH,
  },
  en: {
    ui: {
      COUNTS: "{chars} characters · {words} words",
      LIMIT_ERROR: "The document exceeds the 200,000-character limit (currently {chars}); the preview is frozen at the last valid render. Shorten the text to continue.",
      UPDATED: "Preview updated.",
      COPIED: "Preview HTML copied.",
      CLEARED: "Editor cleared.",
      SAMPLE_CONFIRM: "Click again to replace the current text with the sample",
      SAMPLE_BUTTON: "Load sample",
      SAMPLE_LOADED: "Sample document loaded.",
      DEFAULT_EXPORT_TITLE: "Markdown document",
      EMPTY_HINT: "Type Markdown on the left and the preview appears here.",
    },
    sample: SAMPLE_EN,
  },
};
