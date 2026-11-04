# 食材差額採買單 — B20-54-M2A 發布準備

本輪只準備可審核的正式發布來源與離線產物，交 root 獨立驗收後另行派送 M2B。尚未 push、部署或更新首頁，不能視為上線或外部驗收完成。requested gpt-6.1-sol/max；backend 身分未獨立驗證。

## 固定發布設定

`wrangler.jsonc` 為純 JSON 的 assets-only 設定：name=`glossquote-pantry-plan`、compatibility_date=`2026-10-24`、唯一 custom domain=`shopping-list.glossquote.com`。workers_dev、preview_urls、send_metrics、observability.enabled、logs.enabled、logs.invocation_logs、traces.enabled 均 false。沒有 main、bindings、account_id、env 或其他部署設定。

資產目錄為 `./release-artifacts/site`；run_worker_first=false、html_handling=none、not_found_handling=none。build 命令只執行 `node scripts/release.mjs build`。`check`、`build:release`、`check:release` 均核對設定的固定 canonical bytes；未知、缺少、重複、錯值、BOM 或 reparse point 均拒絕。這是離線契約驗證；本輪未執行 Wrangler CLI、真正 schema/dry-run 或遠端 API。

依 Cloudflare 官方文件核對設定欄位：[Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)、[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)、[Traces](https://developers.cloudflare.com/workers/observability/traces/)、[Static Assets](https://developers.cloudflare.com/workers/static-assets/)。採用本任務指定日期與停用可觀測性，不依技能的一般建議安裝 CLI 或開啟紀錄。

release-only `_redirects` 精確為以下三行，UTF-8 無 BOM，每行 LF，末尾保留 LF：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

不新增 catch-all、SPA fallback 或額外規則。正式 site 封閉 allowlist 現為 16 檔：原 14 檔、sitemap.xml、_redirects；sibling manifest 列出全部 16 檔 path/bytes/SHA-256。部署設定本身屬來源，不進網站資產；完整來源清單另存本輪證據。

## 已驗來源與可見文字

14 檔 M1 public pin 維持 `bd7f4bed29d52631cc9f24b3b93bcb226e441b3a7657eeb4c274f21dc7db4a56`；public 與 preview dist 的內容不變。所有 runtime、CSS、404 及 CSP 維持原 bytes。release 的 X-Robots-Tag 與 head SEO 轉換沿用 M1B。

只有正式產物移除四個精確 suffix：繁中「 · 預覽候選版」「 · 本地預覽，尚未正式發布」、英文「 · Preview candidate」「 · Local preview, not a live release」。其餘 head 以外的 HTML 必須與來源完全相同，匯入預覽等功能文案保留。不加入已上線、通過外部驗收等聲明。

canonical 維持繁中 `https://shopping-list.glossquote.com/index.html`、英文 `https://shopping-list.glossquote.com/en/index.html`；兩頁各一個 canonical、三個 zh-Hant/en/x-default alternate，x-default 回繁中。兩語首頁連結仍各回 matching-language `https://glossquote.com/index.html` 或 `/en/index.html`。

原 M1B 的完整 release-artifacts 已先以舊 verifier 驗證並原 byte 保存於 [baseline](../../.runs/batch20-completion-2026-10-27/owner-54-release/baseline/release-artifacts/manifest.json)。原 manifest SHA-256 為 `1cc78c1c89b7acca1d1f6ed9a836e3971f0df2c9564ef2f9e4cdcebb09060e0b`。新 builder 只因原目錄經審核保存後才可建立新產物；沒有放寬既有未知／缺檔／空目錄／不完整／竄改輸出的拒絕規則，也沒有自動修復或刪除。

## 離線驗證與可重現性

使用既有 Node 24+ 與 npm，零新增依賴、不安裝套件；各 npm 命令加暫時的 `--offline --no-update-notifier --no-audit --no-fund`：

```text
npm test
npm run check
npm run build
npm run build:release
npm run check:release
```

實際 executable/argv/exit/log 見 [final commands](../../.runs/batch20-completion-2026-10-27/owner-54-release/final-commands.json)。全部 child 為 shell:false、windowsHide:true。既有合法產物重建只驗證，不改 bytes/mtime；錯誤設定、資產＋manifest 配對竄改、redirect 新增／改路由／改狀態／改換行、候選文案還原等均須拒絕且保留原物。測試暫存只在 evidence/m2a，歷史證據不變。

完整 SHA-256、來源／受保護檔案前後核對、actual diff、持久環境 guard 見 [本輪 evidence](../../.runs/batch20-completion-2026-10-27/owner-54-release/summary.json) 及 [HANDOFF](HANDOFF.md) 最新段落。完整來源 manifest 包含 HANDOFF；測試前後固定來源清單排除 HANDOFF、evidence、dist、release-artifacts，避免循環紀錄。原產物與歷史檔案雜湊另行驗證。

## 保留的未驗範圍

root 已於 M2A 前執行 54 r2：36 PASS、16 NOT_RUN、0 FAIL，prohibited=[]、parent cleanup PASS；隔離 v7 由 root 派送確認。此處只引用原結果，不宣稱本輪再次執行瀏覽器。詳細 16 項 id／語言／原始原因見 [root-browser-r2.json](../../.runs/batch20-completion-2026-10-27/owner-54-release/root-browser-r2.json)。

以下每項各兩語，維持 NOT_RUN：真實讀取取消窗口、嚴格重選 read overlap、真 200% zoom、刻意延遲的舊讀取完成、hidden lifecycle、opaque Blob registry revoke、受控 HTTP 404、原生／真機／AT。Node 測試不補作這些 PASS。

本輪沒有 server、browser、CUA、IAB、CDP、native、憑證讀取、安裝、push、部署、首頁修改、花費、持久 Windows/Git/auth 改動、子代理或新 ZIP。Wrangler 遠端驗證、正式 HTTP/redirect/404/Network/Storage、實際 GitHub commit/visibility、live hosting、首頁與外部驗收仍待後續有權限的里程碑。root 負責整合單一外層 ZIP。
