# PDF 頁面工具 · PDF Page Tools: Merge, Split, Extract and Rotate

完全在本機瀏覽器處理 PDF 頁面的工具：合併 2–20 個 PDF、依範圍分割（合併輸出
或逐組輸出）、依列出順序擷取頁面、把選取頁面旋轉 90／180／270 度（疊加原有
旋轉）。產生之前先顯示完整計畫，產生後可在任何閱讀器核對頁數與順序。檔案不
離開裝置、不上傳、不儲存；唯一的第三方檔案是 vendored 的 pdf-lib（MIT，
出處與 SHA-256 記錄在 THIRD-PARTY.md），專案本身零 npm 依賴。

A PDF page tool that runs entirely in the browser: merge 2–20 PDFs, split by a
range expression (one combined file or one file per group), extract pages in
the exact listed order, and rotate selected pages by 90/180/270 degrees on top
of their existing rotation. The full output plan is shown before anything is
generated, and results can be verified in any reader. Files never leave the
device — no upload, no storage. The single third-party file is a vendored
pdf-lib (MIT; provenance and SHA-256 in THIRD-PARTY.md); the project itself
has zero npm dependencies.

## 功能 · Features

- 四種模式與計畫先行：合併（清單順序，可上移／下移／拖曳）、分割（群組不可
  重疊）、擷取（嚴格照列出順序，重複頁是錯誤）、旋轉（計畫顯示第一個選取頁
  的結果角度）；錯誤檔案進錯誤清單並附具體原因（不是 PDF／受密碼保護／損毀／
  超限），不會被靜默跳過
  Four modes with the plan shown first: merge (list order, move buttons and
  drag), split (groups must not overlap), extract (strict listed order,
  duplicate pages are an error), rotate (the plan shows the first selected
  page's resulting rotation). Invalid files appear in an error list with the
  specific reason (not a PDF / password-protected / corrupt / over a limit)
  and are never silently skipped
- 範圍文法：`1-3, 5, 8-` 這類表示式，空白可有可無；空表示式、空項目、非數字、
  反向區間、超出頁數、重疊與重複都是具名錯誤，並指出出問題的項目
  Range grammar such as `1-3, 5, 8-` with optional spaces; empty expression,
  empty item, non-numeric token, reversed interval, beyond-count, overlap and
  duplicate are all named errors that identify the offending token
- 輸出命名規則固定：`<來源>-merged.pdf`、`-split.pdf`、逐組 `-p<起>-<訖>.pdf`
  （單頁組 `-p<n>.pdf`）、`-extract.pdf`、`-rotated.pdf`；來源名經過清理
  （路徑剝除、非法字元換成 `-`、上限 60 字元、CJK 保留）
  Fixed output naming from the sanitised source name (path stripped, invalid
  runs collapsed to `-`, 60-character cap, CJK preserved)
- 輸出頁面是原頁複製（文字還是文字）；Producer 固定為
  `GlossQuote Labs PDF Page Tools`；不複製來源的標題／作者等中繼資料；
  結構確定性（同輸入同頁序同旋轉），位元組不保證相同
  Output pages are copies of the originals (text stays text); the Producer is
  the fixed string above; source title/author metadata is not copied;
  determinism is structural (same pages, order, rotations), not byte-level
- 明白的限制：本工具不是遮蔽工具，輸出可能仍含來源的隱藏圖層與中繼資料；
  大綱／書籤與來源內部連結不保證保留；受密碼保護的檔案直接拒絕
  Stated limitations: not a redaction tool — outputs may still contain the
  source's hidden layers and metadata; outlines/bookmarks and internal links
  are not guaranteed to survive; password-protected files are rejected

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core grammar/naming/plans, engine round-trips on generated fixtures, controller via DOM shim)
npm run check  # project check (structure, CSP, forbidden APIs, vendored-file SHA-256, normative fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私與安全 · Privacy and security

檔案位元組只存在於頁面記憶體；檔名只以文字節點呈現，惡意檔名無法注入標記；
下載用 Blob 物件網址並在使用後撤銷。不寫入 URL、標題、日誌或任何儲存。

File bytes live only in page memory; file names render as text nodes only, so
a hostile name cannot inject markup; downloads use Blob object URLs that are
revoked after use. Nothing is written to the URL, title, logs, or any storage.
