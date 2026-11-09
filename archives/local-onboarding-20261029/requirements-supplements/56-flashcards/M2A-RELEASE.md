# B20-56-M2A：assets-only 正式發布準備

日期：2026-10-27。**M2A 準備可交 root 驗證；未進 M2B／公開發布／部署／首頁更新；AWAITING_EXTERNAL_REVIEW**。

## 本輪產物

[wrangler.jsonc](wrangler.jsonc) 固定 name `glossquote-flashcards`、compatibility_date `2026-10-24`；workers_dev、preview_urls、send_metrics 皆 false。只有 `flashcards.glossquote.com` 一條 custom_domain true 路由。observability.enabled、logs.enabled、logs.invocation_logs、traces.enabled 皆 false，依本輪指定及隱私契約；沒有 main、binding、vars、帳號識別或環境覆寫。

assets.directory 為 `./release-artifacts/site`，run_worker_first false、html_handling none、not_found_handling none；build.command 精確為 `node scripts/release.mjs build`。[deployment-config.mjs](scripts/deployment-config.mjs) 在 check／release build／release check 拒絕缺欄、未知欄、不同值、額外路由、Worker／binding／權限擴張、link、過大／無效 UTF-8／重複 key。設定採兩格縮排、LF、結尾 LF 的 plain JSON，亦為有效 JSONC；拒絕 comments／BOM／CRLF 解析差異。

[release.mjs](scripts/release.mjs) 封閉清單由 15 改為 16 個 site 檔，新增 `_redirects`。manifest 精確七欄：schemaVersion、mode、origin、toolSlug、files、sourceFiles、deploymentFiles；新增 deploymentFiles 綁定設定實際 bytes／SHA-256，來源仍逐檔對原 M1 pins。manifest 自身不在可服務目錄。

正式 HTML 僅精確移除 `<p class="candidate">本地候選・未發布</p>` 或 `<p class="candidate">Local candidate · unpublished</p>`；其餘 body 必須逐 byte 等於原版。沒有 banner 時原樣保留，重複或不同 banner 拒絕。public、預覽 generator、runtime JS、CSS、CSP、locales、既有 fixture／golden 均未改。候選樣式及 locale 文字仍原樣保留於來源；本輪沒有清理或改寫它們。

`site/_redirects` 完整 UTF-8 bytes 為以下三行，含最後 LF，沒有其他規則：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

雙語 canonical 固定自指 `/index.html` 與 `/en/index.html`；hreflang zh-Hant／en 互指、x-default 指繁中。每頁核對匹配語系首頁及原語言切換連結；實際 head attributes、完整 expected bytes 與 source pins 均檢查，不能僅改 manifest 接受篡改。

## 實際離線驗證

Node.js v24.14.0，無依賴安裝。五命令對同一固定程式碼順序執行，全部 exit 0：

|命令|結果|
|---|---|
|npm test|133 PASS／0 FAIL／0 skipped；Node、fake data、fake DOM|
|npm run check|14 個 public 檔及安全／隱私／預覽／部署契約通過|
|npm run build|14 個 preview 檔與 public bytes 一致，維持 noindex,nofollow|
|npm run build:release|16 個 site 檔與獨立 manifest|
|npm run check:release|來源 pins、封閉清單、完整 bytes／manifest／設定／雙語 SEO／home links 通過|

新增設定正反例、精確 banner 移除與非目標文字保留、精確 redirects、config／redirect＋manifest 同改、未知 manifest 欄及越界 deployment record。原來源污染、runtime＋manifest 同改、SEO 篡改、缺／多檔、未知目錄、錯 domain/schema、traversal、symlink/junction、CLI 拒絕及既有輸出不覆寫測試均保留。暫存 fake copy 只在 `evidence/m2a/fixtures/`，結束已清空；沒有 server／HTTP／browser。

首次 npm test 是 132 PASS／1 FAIL：新測試用 rmSync 移除空目錄，Windows 回 ERR_FS_EISDIR。僅改測試為 rmdirSync 後，重跑上述五命令全過；首次失敗與修正後紀錄分開保存，沒有改列 PASS。固定執行來源 52 檔／289791 bytes、集合 SHA `0c047974bfd8fa4ceb2a2f2d80e69d58a2ab17ecadf006119aed6f3f0861a3a8` 前後一致；此清單含當時 HANDOFF，不含稍後加入的本說明，最終文件身份另見 final inventory。

## 身份及保存

|集合／檔案|檔數／bytes|SHA-256|
|---|---|---|
|reviewed public|14／88761|`316ad7abd6453a50151fbddfc027640a7cd22485981d25e1da4a709988af9542`|
|M2A site|16／89732|`278944b715f4d4a8c508ba17a7ae4ef8287737e70b9fe8e4ff2aa1b7df0dfbbc`|
|M2A manifest.json|見實際檔案|`e3b8f00c541288ff711746148f0d78bc48728e5aa4f3b68feea211b8d6a7d594`|
|wrangler.jsonc|見 deploymentFiles|`e082711dacfc384b0b81f95896233b36dc83f486f3f92f4fea33a5a89b9ad410`|

集合 SHA 為依 path 排序的 `{path,bytes,sha256}` records 緊湊 JSON 加 LF 再 SHA-256；public/site path 相對各自根。單檔 SHA 對原始 bytes 計算。最終完整 release-artifacts／source 逐檔 bytes/hash、實際完整 diff 及環境紀錄見 [owner 證據入口](../../.runs/batch20-completion-2026-10-27/owner-56-release/00-START-HERE.md)。

原 M1B release-artifacts 先用原 builder check 驗證 exit 0，再核對精確絕對路徑，以 Move-Item 保存於 owner `baseline/release-artifacts/`。原 16 檔 bytes/SHA 全保留；新 builder 未加入清除／覆寫，既存不匹配輸出仍拒絕。歷史 site SHA `d46fb5bcf93651637e62151ed15f9079c3103a171fd613e6094a5624e0772f70`、manifest SHA `e7c188b032d2cd61ab3f0b0d00c7ab874d119f17a622b760053487e4f8031d19`，不當作本輪新產物。

## 待驗與權限界線

root 已執行 b20-56-r2：**34 PASS／12 NOT_RUN／0 FAIL**、prohibited `[]`、cleanup PASS。本 owner 只讀並保存回條身份，沒有執行 browser。該回條對應先前 M1B frozen site；本輪 banner／redirects／設定的正式產物隔離驗收及 hosting HTTP 由 root 下一步執行，不能以 Node 測試聲稱新 site 的 browser 或 live PASS。

12 NOT_RUN 原狀保留：兩語系各有實際 200% zoom、真正背景 visibility、原生 chooser/save/print/clipboard、真機及 screen reader／AT、live hosting、未知路徑 HTTP404。逐項 reason／原 status 見 owner root-r2-receipt.json。外部審查仍待驗，沒有宣告產品 complete。

Environment guard 前後完全相同：HKCU PATH ExpandString／834 chars，HKLM PATH String／1227 chars，ephemeral entries 均 0；PATH SHA/type/length、完整 Environment-key 指紋與 TEMP/TMP hash/type/length 均一致。既有 duplicate PATH 保留。

本輪沒有讀憑證、Cloudflare CLI/API mutation、push、部署、首頁修改、全域 Git/auth／持久設定、local browser/IAB/CUA/CDP/native 操作、clipboard/dialog 或再委派。公開 repo commit／visibility、live hosting、首頁皆尚未執行。由 root 親讀 diff／hash 後才進 M2B；本輪交回單一整合 archive 流程，不另製第二份 ZIP，保留歷史版本與證據。

## 唯讀設定依據

2026-10-27 核對 [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)、[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)、[static asset redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)、[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)。分別支持 assets-only 省略 main／none 選項、asset directory 的 `_redirects` 解析及 invocation_logs 位置。本輪未執行 Wrangler schema／dry-run／deployment，平台實際行為仍待 root gate。skill 建議的日期及啟用觀測由本輪明確指定日期與 false 設定取代。
