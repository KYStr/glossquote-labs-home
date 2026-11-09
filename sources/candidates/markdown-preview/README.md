# Markdown 預覽與 HTML 匯出 · Markdown Preview and HTML Export

完全在本機瀏覽器運算的 Markdown 即時預覽：支援的語法是公開宣告的 CommonMark 子集，
每一項偏差都列在頁面說明與本檔案中；原始 HTML 一律轉義顯示、連結與圖片協定有白名單。
渲染出的 HTML 字串是預覽、複製與匯出的唯一來源；匯出是一個樣式內嵌、離線可開的
獨立 HTML 檔案。零 runtime 依賴、不連網（草稿中的圖片由瀏覽器自行請求，頁面有提醒）、
不儲存。

A Markdown live preview that runs entirely in the browser. The supported grammar is a
published CommonMark subset with every deviation listed in the page help and below;
raw HTML is always escaped and link/image schemes are whitelisted. The rendered HTML
string is the single source of truth for the preview, the clipboard copy, and the
standalone export file with its stylesheet inlined. Zero runtime dependencies, no
tool-initiated network, no storage.

## 支援子集與偏差 · Subset and deviations

支援：ATX 標題、段落、程式碼區塊、引言、無序/有序/任務清單、分隔線、管道表格（含對齊）、
行內程式碼、斜體/粗體/刪除線、行內與完整參考式連結、圖片、尖括號自動連結、反斜線跳脫、
強制換行。

Supported: ATX headings, paragraphs, fenced code, blockquotes, unordered/ordered/task
lists, thematic breaks, pipe tables with alignment, code spans, emphasis, strong,
strikethrough, inline and full reference links, images, angle autolinks, backslash
escapes, hard breaks.

偏差（完整清單）：不支援 Setext 標題；原始 HTML 轉義不執行；不支援摺疊式 `[文字][]`
與捷徑式 `[文字]` 參考連結；裸網址不自動連結；HTML 實體僅透傳具名集合
`&amp; &lt; &gt; &quot; &#39; &nbsp;` 與數字字元參照。

Deviations (complete list): no setext headings; raw HTML is escaped, never executed;
no collapsed `[text][]` or shortcut `[text]` reference links; bare URLs are not
autolinked; entities pass through only for the named set above plus numeric
character references.

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (SPEC fixtures, hostile inputs, stress, controller via DOM shim)
npm run check  # project check (structure, CSP, forbidden APIs, normative fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私 · Privacy

草稿只存在於頁面記憶體；工具本身不發出任何網路請求、不寫入任何儲存。
唯一的外部請求是草稿中圖片網址由瀏覽器在預覽時載入——圖片已設定
`referrerpolicy="no-referrer"`，頁面說明也有提醒。

The draft lives only in page memory; the tool itself makes no network requests and
writes no storage. The only external requests are image URLs from the draft, loaded
by the browser at preview time with `referrerpolicy="no-referrer"`, as the help
text warns.

## 狀態 · Status

本 repo 為作品集候選版本（依 2026-11-02 build-first 指示先行建置，registry 登錄與審查
於後續批次階段處理），未部署、未上架。見 `PRODUCTION-STATUS.md` 與 `VERIFICATION.md`。

This repository is a portfolio candidate built ahead under the owner's
2026-11-02 build-first directive; registry registration and review follow in
the bulk phase. It is not deployed or published. See `PRODUCTION-STATUS.md`
and `VERIFICATION.md`.
