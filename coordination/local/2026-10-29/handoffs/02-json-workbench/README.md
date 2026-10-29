# JSON 檢查與排版

## Current live release — 2026-10-11

[繁體中文](https://json.glossquote.com/index.html) · [English](https://json.glossquote.com/en/index.html)

Deployed source: [44ce2844ffca](https://github.com/KYStr/glossquote-labs-json-workbench/commit/44ce2844ffcab4ed5c90ef066dcfc5dfdf233520); Cloudflare version `0ed10b51-ad10-4b28-b5f3-8c4b91488b3e`. This dated status supersedes older candidate-only or NOT_DEPLOYED notes below. Later documentation-only commits do not change the deployed assets.

Release verification passed: 17 public assets matched the reviewed build byte for byte across 38 HTTP response checks, including HTTPS, security headers, MIME, bilingual SEO, robots/sitemap, missing paths and configured redirects. Both language pages received scoped browser checks. Number-token preservation and decoded duplicate-key rejection were exercised.

The runtime retains its previously accepted offline test evidence; this release changes hosting configuration and documentation, not tool algorithms. Full Network/Storage inspection, physical devices, assistive technology and all remaining documented manual checks are still NOT_RUN. Live publication is not a claim of exhaustive certification or search-engine indexing.

繁體中文與英文的瀏覽器 JSON 檢查工具。以有界 parser 保留原始數字、字串與鍵順序，提供兩空格排版或一行輸出；重複鍵、非法語法、未配對 Unicode 與超限資料會停止處理。

給需要檢查設定檔片段、閱讀 API 範例的人：貼入 JSON，檢查完整語法與重複鍵，再以兩空格排版或壓成一行。原始數字與字串 token 的寫法不被重新解讀。

- MVP 一句話：以有界的 token parser 整理 JSON 空白，保留數字精度與鍵順序，拒絕重複鍵。
- 價值：9007199254740993 不會變成另一個數字；重複 key 不會悄悄只留下最後一筆。
- 依賴：原生 HTML/CSS/ESM、Worker、TextEncoder；Node 24+ 僅開發測試，runtime 零套件。
- 非目標：JSON5、註解、YAML、schema 驗證、樹狀修改、鍵排序、數學計算、JSONPath、URL 擷取、檔案上傳與永久保存。

精確限制可在兩語網站下方與核心測試閱讀；實作與驗收現況以 [VALIDATION](docs/VALIDATION.md) 為準。公開來源只包含本工具程式、測試與必要說明；開工與協作規範保留在孵化器工作區。

Node 24+；不需要 npm install，沒有 runtime 或 development 套件。

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run build
npm.cmd run dev
```

預覽僅綁 127.0.0.1:4182，提供 public，預設 noindex。若埠已佔用，以 `npm.cmd run dev -- --port=0` 使用空閒 loopback 埠。繁中 `/index.html`，英文 `/en/index.html`。離線處理是「本頁完整載入後」的能力，不保證關閉後離線重開。

修改 lexer/parser/formatter/worker 後先執行 `npm.cmd run build:worker`；check 會拒絕過期或被修改的生成 bundle。Worker 程式來自固定本地模組，與使用者 JSON 完全分離；每次處理後終止並撤銷 object URL。HTML-looking 內容只放 textarea.value，無 storage、遙測、遠端字型或處理 API。

發布準備：`npm.cmd run build:release` 只接受候選 origin `https://json.glossquote.com`，生成 canonical/hreflang/sitemap/robots 和靜態標頭。預設 build 永遠產生預覽 noindex；dist 不包含在來源發布。產物驗證在 build 中自動執行。`wrangler.jsonc` 僅是主對話後續整合用的配置，本工具對話沒有正式部署。

狀態與人工例外見 [驗收](docs/VALIDATION.md) 和 [Release candidate](docs/RELEASE-CANDIDATE.md)。真正網站上线、搜尋收錄、Firefox／實體手機／native zoom200%／輔助工具驗證未宣稱完成。

English: paste JSON, select an output format, then check and copy or download the result. All processing stays in page memory. Long number spellings are preserved; downstream numeric precision is not guaranteed. This repository contains a bilingual local MVP and release preparation, not evidence of a live deployment.
