# B20-53-M2A — 正式發布準備

2026-10-27（Asia/Taipei）。狀態：**M2A_PREPARED_NOT_PUBLISHED_NOT_DEPLOYED**。配置請求 gpt-6.1-sol/max；backend identity 未獨立確認。本輪完成離線來源與產物準備，交 root 獨立驗收；M2B、hosting、首頁與使用者外驗另行處理。

## M2A-F1 更正

root 指出共同部署 gate 要求固定 build hook。已在 config 與 expected config 增加精確 `build:{command:'node scripts/release.mjs build'}`；原 M2A 缺少此欄位，不能發布。這個指令只執行既有 release builder，不包含 install、Wrangler、push 或 deploy；builder 的 fail-closed／未知產物拒絕規則保持。

新證據為 `.runs/batch20-completion-2026-10-27/owner-53-release-r1/`。更正前整個 M2A 工具樹及 release 容器已驗證並封存在其 `baseline/tool-projects/53-image-overlay/`；舊 owner-53-release 及全部固定來源／產物紀錄保持。新增 build 缺少、命令改動、附加 shell 指令、錯型別、額外 cwd／environment 的拒絕及聯合偽造 manifest 測試。原 public／runtime／CSP、三列 redirect 與全部 16 site assets 不變；manifest 只更新 config bytes／SHA。

M2A-F1 實際 `node --test test/release.test.mjs` 為 17 pass／0 fail／0 skip；`npm run check`、`build`、`build:release`、`check:release` 皆 exit 0。未變的原 41 項沿用原 M2A 證據，沒有重跑或宣稱新一輪全套 58 PASS。環境 guard 前後相同；完整 commands／雜湊／比對見新 evidence summary。以下 57 tests 是原 M2A 歷史結果，不當作 F1 的新通過紀錄。F1 未執行 browser、GitHub create、push 或 deploy。GitHub repo 建立目前有頻率限制；後續 M2B 只能依 root 的新指示準備 local copy，不能自行 create。

## 本次差異

- 新增 `wrangler.jsonc` 與 `scripts/release-config.mjs`：固定 `glossquote-image-overlay`、domain `image-proof.glossquote.com`、compatibility date `2026-10-24`，assets 只指向 `./release-artifacts/site`。
- `workers_dev`、`preview_urls`、`send_metrics`、observability enabled／logs enabled／invocation_logs／traces enabled 均為 false。沒有 main／Worker script、vars、bindings、account ID 或憑證。
- `run_worker_first:false`、`html_handling:"none"`、`not_found_handling:"none"`。config 本身不會作為網站資產；本輪未執行 Wrangler 或連線帳戶。
- release site 唯一新增資產為 `_redirects`，精確 UTF-8／LF bytes 如下；最後一列後也有 LF。

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

- sibling manifest 升至 schemaVersion 2；新增 deploymentConfig 的 path／bytes／SHA-256，site 清單由 15 變 16。其餘 canonical／hreflang／SEO 轉換與 mode 保留。
- 兩語現有 title 沒有候選前綴，因此沒有移除或重寫 title。所有 `public/`、原 15 個 release site 檔、JS／CSS／核心／CSP／輸出程式保持原 bytes；preview build 產物內容也不變。

`html_handling:none` 的設定與 `_redirects` 格式已對照 [Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)及 [redirects 文件](https://developers.cloudflare.com/workers/static-assets/redirects/)。這些文件與離線 bytes 檢查不能證明正式網址實際回傳的 status／headers。

## 封存與 fail-closed

root 指定 evidence 根為 repository-relative `.runs/batch20-completion-2026-10-27/owner-53-release/`。先以舊 checker 核對原 manifest SHA `166eeb51aee5b522433041911bb3e5de9214d4d345e5dc523c4128aa4e5df50e`，將整個原工具樹（含所有舊 evidence）封存為 `baseline/tool-projects/53-image-overlay/`，逐檔核對原 166 檔 bytes／SHA。只將已核對的原 release-artifacts 容器移到該 archive；沒有刪除或覆蓋它。

原 builder 的封閉清單、固定 M1 public pin、獨立 bytes 重建、unknown file／空目錄／link 拒絕、首次 exclusive write、既有合法輸出的 no-op 與不自動修復規則保持。新 config 採固定 canonical bytes；缺少、異動、link、額外或重複 key、額外 domain、Worker／vars／bindings、telemetry 或 routing 改動皆拒絕。偽造 manifest 中的 config／redirect hash 也不能使篡改產物通過。

`scripts/freeze-release.mjs` 與 `M1B-RELEASE.md` 是已封存的 M1B 歷史流程／說明，沒有改寫，也**不要再次執行 freeze-release** 覆寫舊證據。當前 M2A 的 commands、完整原檔清單、scope diff、source／artifact manifests 與 environment comparison 由上述 owner evidence 提供；root 負責納入單一整合交付 ZIP。

## 實際檢查

從本工具目錄，既有 Node24、零依賴、離線假資料執行：

|Command|Exit|結果|
|---|---|---|
|`npm test`|0|57 pass／0 fail／0 skip（原 41，加 release 16）|
|`npm run check`|0|13 個 public 檔的既有靜態／語法／安全規則|
|`npm run build`|0|preview-noindex；輸出內容與原版相同|
|`npm run build:release`|0|16 site assets＋sibling manifest，新容器首次建立|
|`npm run check:release`|0|M1 source pin、部署 config、封閉清單、獨立 expected bytes 與 canonical manifest 一致|
|既有環境 guard 前／後|0／0|User／Machine PATH type、length、SHA、ephemeral count、TEMP／TMP 與完整 Environment-key fingerprints 完全一致|

新增測試覆蓋固定 assets-only config、22 種權限／routing／telemetry 擴張、config 缺少／link／重複 key、偽造 config hash、三列 redirect 的順序／status／末尾 LF、canonical targets 無 redirect loop，以及 redirect bytes 與 manifest hash 聯合偽造。既有 unknown output、source pin、CSP、CLI、symlink／junction 與 no-op 防護持續通過。

## Browser 與未驗項

主代理已報告並記錄 r3 focused 真 browser 8 PASS／0 FAIL、prohibited 空、parent cleanup PASS，並親看 7 張實際 focus-edge／region 截圖。只替換原兩個 keyboard FAIL，合併採計 **40 PASS／12 NOT_RUN**；BOOT／privacy／context 支援案例不重複加計。這是 root 的隔離執行及畫面審查，本 owner 沒有啟動 browser 或操作桌面。本次原 15 個已驗 site 資產不變，額外 redirect／hosting config 尚需 root 發布階段驗證。

12 個原人工／能力缺口保持 NOT_RUN，包括既有 200% zoom、native／device／AT 等子項；不因 M2A 或 Node checks 轉為 PASS。另有 Wrangler dry-run、實際正式 301／headers／404／robots／sitemap transport、GitHub publication、Cloudflare release、雙語首頁整合與使用者外驗 **NOT_RUN**。網站未部署，來源尚未推送，外驗未通過；root 驗收 M2A 後於原對話發出 M2B。
