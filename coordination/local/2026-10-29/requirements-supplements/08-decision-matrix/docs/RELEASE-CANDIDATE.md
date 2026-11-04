> **2026-10-11 最新發布狀態：PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER。** 正式網站已上線；以下舊的 NOT_DEPLOYED、來源 commit 與整合待辦保留為歷史，現況以文末[本輪發布更新](#release-20261011)為準。人工 NOT_RUN 依該更新保留。

# 權重決策矩陣 — 發布候選

日期 2026-10-10。狀態 **READY_FOR_INTEGRATION**。本機必要邏輯及可行性gate、獨立來源副本已驗收，公開GitHub來源已核驗。這是原主對話的整合候選，尚未正式上線。

- 工具：08-decision-matrix；繁中/index.html、英文/en/index.html。
- 候選網址：https://decide.glossquote.com/index.html、https://decide.glossquote.com/en/index.html。未部署、未操作DNS/帳戶/首頁/040141.xyz/GlossGate。
- 實作：2–8方案、1–8準則、benefit/cost、weight0..100、score1..5/null、整數N平手/competition rank、缺分或W0無假排行、逐項貢獻、memory-only、JSON schema1 exact validation、64KiB UTF8、generation取消/候選取代確認、單一Blob URL撤銷、keyboard與dialogfallback、靜態兩語公式/FAQ/同語首頁連結。
- 依賴/資產：無runtime/dev套件、無模型/遠端字型/外部圖片/telemetry。Node24.14.0/npm11.9.0開發；Chromium155真實驗收。

## 可重現檢查

```text
npm.cmd test
npm.cmd run check
npm.cmd run build
npm.cmd run build -- --production --origin=https://decide.glossquote.com
node scripts/serve.mjs --dist --port=4188
```

預設preview14靜態資產/noindex、robots Disallow；正式候選15靜態資產/兩canonical+雙向hreflang+x-default/sitemap兩URL、robotsAllow+Sitemap、安全headers/MIME。404仍noindex。只允許上述origin；dist受限定/拒symlink，不包含test/docs/工作檔/憑證；build不部署。正式產物應在主對話正式release之前由命令重建。

## 驗收與人工 NOT_RUN

31項offline必要邏輯/安全/SEO/server行為有PASS證據；孵化器最後全套30PASS/1FAIL（新增404內容case），修復後受影響scaffold2/2 PASS。經審查獨立副本實際再跑 `npm.cmd test` **31/31 exit0**、`npm.cmd run check` **exit0**、`npm.cmd run build` **exit0**，確認可獨立使用，沒有借用其他工具。真正Chromium：評分/66.67並列與貢獻/缺分清舊結果、chooser/取消/壞檔/取代、Blob下載roundtrip、keyboard與focus、320px雙語/8×8/40字、resource/storage/URL/console、缺能力/noJS/dialogfallback PASS。詳情 docs/VERIFICATION.md及本機HANDOFF。

人工NOT_RUN：Firefox、物理手機touch、真正讀屏朗讀、200%真瀏覽器zoom（IAB shortcut沒有生效）、OS filepicker全鍵盤、完整DevToolsNetwork封包視圖與物理斷網、404狀態的IAB導航（client阻擋；HTTP回歸與404HTML直接預覽PASS）、Wrangler平台dryrun/真hostHTTPS/MIME/headers/SEO。使用者已允許保留人工例外，沒有把必要公式/算法gate移到NOT_RUN。

## 整合者下一步

1. 獨立審查公開來源commit、測試與manual例外。發布副本只含本工具allowlist；模型配置要求Sol/max，後端路由沒有独立host證據，未假稱確認。
2. 如通過，重建正式候選，以既有授權部署免費Cloudflare靜態資產到decide.glossquote.com。候選wrangler.jsonc無account/route/secret；原主對話處理憑證、網域與正式部署，驗兩語真host、404、MIME/headers/canonical/hreflang/sitemap/robots。
3. 驗證正式live後，原主對話在00-home新增/發布雙語catalog項目、發布首頁獨立來源並部署首頁，驗兩語catalog。此對話未改00-home。
4. Source-only公開不等於live；不可把本文件候選網址當成已上線證據。

## 已核驗來源

公開來源：[KYStr/glossquote-labs-decision-matrix](https://github.com/KYStr/glossquote-labs-decision-matrix)，**PUBLIC**。

已驗收的實作來源 commit：[774dd595a1ed9f09ac1f466abba91756aa499309](https://github.com/KYStr/glossquote-labs-decision-matrix/commit/774dd595a1ed9f09ac1f466abba91756aa499309)。Git ls-remote、GitHub commits API、copy local HEAD三者一致，發布樹38檔与審查清單完全一致，內容按Git換行正規化核對一致。僅該工具的public/scripts/test/package/project/wrangler/README及必要規格/驗收文件；無dist/.runs/憑證/私人檔案/其他工具。

完成此來源核驗後，交接文件會以另一筆documentation-only commit更新；程式/測試/建置設定維持上述已驗收commit。最新遠端HEAD由本機HANDOFF及專用核驗JSON記錄，以免文件自我引用自己的commit造成假hash。

本機證據在專用 `.runs/decision-matrix`：source-review-v2-20261010.json、source-verified-v1-20261010.json、published-copy-{test,check,build}-20261010.log（exit0）、browser screenshots/API/privacy/下載roundtrip與環境fingerprints。不隨公開來源上傳這個目錄。

hosting：**NOT_DEPLOYED_BY_THIS_CHAT**；主對話整合審查及免費hosting流程待執行，無缺失使用者重複授權。manual NOT_RUN清單如上，需真平台驗收的風險沒有被來源公開消除。


<a id="release-20261011"></a>

## 2026-10-11 正式發布更新

- 狀態：**PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER**。下列證據取自已保存的主代理發布紀錄；本次文件更新未重跑 Git、部署、HTTP 或瀏覽器測試。家族首頁整合結果由主對話發布報告另行記錄。
- 正式網址：[繁體中文](https://decide.glossquote.com/index.html)、[English](https://decide.glossquote.com/en/index.html)。
- 公開來源：[KYStr/glossquote-labs-decision-matrix](https://github.com/KYStr/glossquote-labs-decision-matrix)，**PUBLIC**；verified source commit／remote HEAD 均為 [f99595e10aabab97d8ee2ab3e7a0999506b65b88](https://github.com/KYStr/glossquote-labs-decision-matrix/commit/f99595e10aabab97d8ee2ab3e7a0999506b65b88)（2026-10-11T06:22:15.664Z）；[來源發布 JSON](../../../.runs/release-2026-10-11/decide-source-publication.json)。
- Cloudflare：正式 host decide.glossquote.com，部署 exit code **0**；version **70679fb3-726a-4056-be7d-49de3a6dd7aa**（2026-10-11T06:22:23.2179709Z）；[部署 JSON](../../../.runs/release-2026-10-11/decide-deployment.json)。
- HTTP：**PASS_HTTP**（2026-10-11T06:23:22.009Z）。14 個發布資產的 GET／HEAD 均為 200，GET 精確位元組／SHA256 與發布 dist 對應；HTTPS、CSP/MIME、canonical/alternates、robots/sitemap 檢查通過。兩個不存在路徑為真 404；兩語 browser User-Agent 頁面均為 200 且 SHA256 對應。共 32 筆 HTTP 紀錄；[正式 HTTP JSON](../../../.runs/release-2026-10-11/decide-live.json)。
- 瀏覽器：**PASS_SCOPED_BROWSER**（2026-10-11T06:31:45.136Z）。未填四格時阻擋排名；英文同分 50.00、成本方向 100.00／0.00 與零權重阻擋成功；繁中顯示並列 100.00。原生下載 JSON schemaVersion 1，兩方案各保留兩個 null（共四個 null），未將未填評分改成 0。 [本輪瀏覽器 JSON](../../../.runs/release-2026-10-11/decide-browser.json)。
- 剩餘人工 **NOT_RUN**：完整 Network/Storage、跨瀏覽器／真實裝置、screen reader、物理斷網；原有 Firefox、實體手機／觸控、真正 browser zoom 200%、OS filepicker 全鍵盤與 IAB 404 狀態導航例外仍保留。HTTP 真 404 已通過。 本輪 scoped browser 與靜態 HTTP 驗收不構成完整封包／Storage 稽核。
- 原有本機 MVP gate、產品限制與歷史命令結果維持上方歷史紀錄；本輪新證據取代其舊正式 hosting／live HTTP 待驗狀態，沒有把人工未跑項目改標 PASS。所有時間為 UTC。
