# 報價單快速製作 — M1B 離線發布候選

任務 B20-RP-57，2026-10-23 Asia/Taipei。這是必要 browser gate 之前的離線發布準備；**不是 M2 放行、正式發布或已上線網站**。預定 origin 固定為 `https://quote.glossquote.com`，toolSlug `quote-builder`；不讀環境設定，不接受可變網址、輸出路徑或部署參數。

## 重現

使用現有 Node 24+，無依賴／安裝需求。在此工具目錄執行：

```text
npm run build:release
npm run check:release
```

package scripts 分別呼叫 `node scripts/release.mjs build` / `check`。直接執行 script 無參數、未知 mode 或多參數一律 exit 1；不會預設 build 或部署。原 test/check/build/dev 保持既有行為。

完整本輪 Node gates 可用 `node scripts/m1b-gates.mjs`：依序執行 npm test、check、build:release、check:release，證據只寫 `evidence/m1b`。執行者依根契約在長測試前後另外執行 Windows environment guard，比較完整 Snapshots。不要使用 M1 的 `run-gates.mjs` 或 `freeze.mjs` 來更新此輪證據；它們是原 M1 工作流程。

## 產物與驗收入口

- browser 驗收者應在主代理核可的隔離機制使用 **`release-artifacts/site/`**；中文入口 `index.html`，英文入口 `en/index.html`。本輪沒有開啟 browser、server、CDP、native app 或 OS dialog。
- `release-artifacts/manifest.json` 位於 site 之外；schemaVersion 1，mode release-candidate，固定 origin / slug，11 個 site files 和完整 8 個 public sourceFiles，各有相對 path、bytes、SHA-256，排序無重複。
- site 為既有 8 個 allowlist 資產加 `_headers`、`robots.txt`、`sitemap.xml`。6 個非 HTML runtime 檔案逐 byte 保持 M1；兩語 HTML 僅在 head 改 robots 為 index,follow、新增唯一 canonical 和 zh-Hant/en/x-default 互返。x-default 指中文 `/index.html`。
- 保留可見「本地候選版本 / Local candidate」文案。`public`、原 `dist` 與舊 `evidence/m1` 完全不改，兩個 preview 頁仍 noindex,nofollow、無正式 canonical/sitemap。
- `_headers` 依 `scripts/files.mjs` 的 `securityHeaders`（由既有 `serve.mjs` 匯入使用）產生；CSP、隱私 headers 原值逐項保留，只將 X-Robots-Tag 改成 index, follow。此為設定檔，不是實際 hosting header 證據。

## 完整性與停止規則

`release.mjs` 固定原 M1 8 份 public 的 bytes/SHA-256。每次 build/check 都驗來源 exact tree、來源鎖、重新產生預期 SEO／headers／robots／sitemap／manifest，再與現有 output bytes 對照；不相信現有 manifest 提供的 hash。manifest+asset 一起改、錯 origin、錯語系互返、缺檔、多檔、未知空目錄、source change、symlink/junction 均拒絕。

已有完全相符的 managed output 時，build 驗證後直接保留，不改檔案或 mtime。同輸入在不同臨時 copy 產生同 bytes。初次建立使用 exclusive writes；沒有 recursive mkdir/delete、不取代既有路徑。失敗只可回收此次自己建立且仍等於原 bytes 的檔案與空目錄；有未知／修改內容時保留並停止，不自動修補或清空產物。

若來源或既有輸出拒絕，保留現況交主代理判斷；不為了重建而刪除目錄、解除鎖定或改 public。需要調整核心產品、來源鎖、權限或依賴時，另設有界任務。

## 尚缺 gate

B01–B05 browser／viewport／200%／鍵盤／實際下載／HTML 開啟／Network/Storage／原生／真機仍 **NOT_RUN_USER_FOCUS_INCIDENT**。真 HTTP / server 維持 **NOT_RUN_BY_TASK_NO_SERVER**。本輪的 Node 文字解析、檔案 hash、fixture 測試及 `_headers` 設定不替代以上 gate。

沒有 GitHub publication、Cloudflare deployment、正式首頁 inclusion、實際 hosting headers 或外部驗收。本候選若由不受控的靜態主機直接提供，因 SEO 已是 index,follow 可能被索引；主代理應維持離線，待必要 gate 通過並明確放行後才發布。

實際命令、範圍、來源與產物 hash、Environment guard 結果見 [HANDOFF](HANDOFF.md) 的 M1B 追加段，以及 [本輪命令](evidence/m1b/commands.json)、[本輪來源清單](evidence/m1b/source-manifest.json)。requested gpt-6.1-sol/max，實際 backend 身分不以自述確認。
