# M1 工作紀錄

範圍：B20-43-M1，原功能實作，2026-10-23（Asia/Taipei）。要求配置 gpt-6.1-sol/max；未獨立核實 backend 身分。只修改本工具允許路徑，不推送、不部署、不開 server/browser、不委派。

已讀 14 份本工具規格、安全基線、PRODUCT-THESIS 與完整家族設計契約。本工具 DESIGN-SYSTEM 與家族文件 SHA-256 相同。採 frontend-design skill，專案規格優先。

完成條件：嚴格 CSV + template/缺值檢查 + 一次字面代入 + 雙語靜態操作頁 + TXT/JSON + stale/cancel/reset/pagehide；最終 Node tests、check/build 通過並固定來源。真 browser/Network/Storage/clipboard/下載/原生不在本輪安全可驗範圍。

介面方向：Product App；活動主辦在一般桌面/手機瀏覽器批次準備通知，最重要物件是逐人通知文字。常用名單、範本、檢查、產生固定可見；複製與下載鄰近預覽；欄位用法與格式說明可展開。預設空白畫布，範例須明確操作載入。無任何自動傳送。

```text
桌面：頂列（工具／語言／清除）
      步驟導覽 | 名單＋範本＋缺值檢查
               | 預覽（最大閱讀區）＋上一筆／下一筆／複製／下載
手機：頂列 → 步驟連結 → 名單 → 範本 → 檢查 → 預覽與輸出
```

環境 guard 首次包裝命令 exit 1：PowerShell 成功腳本沒有設定 LASTEXITCODE，將 null 誤判非零；沒有環境變更。直接執行 guard JSON Status=PASS 後，改以 Status 驗證並保存 environment-before.json；這是命令包裝修正，不是 guard FAIL。

## 階段紀錄

- T00：scaffold check exit 0。T10：CSV tests 10/10。T20：npm test 28/28。各步通過才接下一步。
- T30：一次 UI patch 因同一 CSS 路徑使用 Delete + Add 被 apply_patch 驗證拒絕，未寫任何檔；拆成 Update 後成功，不是產品／測試失敗。產出兩份完整靜態頁，check/build exit 0。
- T40：45/45 tests，check/build exit 0。整合時補上分段預算，避免高倍數模板先 join 超大字串；generation／取消／Blob cleanup 與 Node app wiring fake 測試通過。
- T50：加 SEO、路由、建置拒絕案例及靜態對比檢查，工具鏈 6/6；補跨片段 surrogate bytes 案例。最終 `node scripts/verify.mjs` exit 0，52/52、check/build PASS。code tree SHA-256 `62dbeac59f5a7b728c70fad603532681d67b99e5da25410e293db5e52d40cc97`。
- guard 在實作前、最終測試前及最終測試後均 PASS；完整持久 Environment 與 PATH 不變。13 份保護規格未修改。
- 原始規格六份、AGENTS 與 docs 無修改；未觸碰 root／兄弟工具／首頁／看板。無 npm install、網路服務、devserver、browser、clipboard、OS dialog 或部署操作。

交付到 M1 主代理驗收邊界，無自行跳 M2/M3、無自動 goal、無另建 ZIP。後續細項與實際檔案／證據見 [HANDOFF](HANDOFF.md)。

## B20-43-R01 — 主代理回修

主代理實際讀碼指出：選檔在驗證前清 textarea，加上 `acceptSource()` 失敗仍回 true，造成使用者修過的唯一貼文遺失。承認這是初版未涵蓋的缺陷，原 52/52 不代表沒有這個問題。

- 只在目前檔案解碼／CSV 驗證成功後清貼文；錯誤／取消／過期保留。主動來源與舊成果仍立即撤銷，未誤認無效新檔已載入。可明確重新載入保留貼文，模板與選項保持。
- 評估既有 generation 後沿用原規則：讀檔期間更改模板／選項使 token 作廢，選檔 selection 清除，晚回不能提交；貼文改動／新檔／reset／pagehide 亦不被舊檔回填。
- 修改 8 個來源、5 個 dist；[精確差異清單](evidence/m1/r01/change-summary.json)。前一版 source/delivery manifests、原始 logs、受影響來源與文件 bytes 保存於 evidence/m1/r01/before；沒有刪掉或重新宣稱歷史候選通過 R01。
- `node --test test/app.test.mjs test/session.test.mjs` exit 0，39/39（新增雙語事件層 20 案例、session 2 案例）。`node scripts/verify.mjs` exit 0，**74/74**，check/build exit 0。新來源 tree SHA-256 `cd159a2f17a6281eca9f4cdeb102110a39f5e7c3774659b3bc676b28d3427f32`。
- R01 guard 前後及相對 M1 後置環境完全相同，13 份保護規格不變。沒有 browser／OS／真 clipboard／server／發佈／部署；真 UI／Network／Storage 仍 NOT_RUN_USER_FOCUS_INCIDENT。等待主代理覆驗，不自行進階段或反覆輪詢。

## B20-RP-43 — M1B 離線發布準備

完整讀取本輪 `.runs/batch20-release-prep-2026-10-23/TASK.md`。允許範圍只含本工具 package/.gitignore/scripts/test/交接/M1B 文件/evidence/m1b/release-artifacts；public/dist/原 evidence 與保護規格保持 bytes。不以本輪重跑測試宣稱 browser 通過，未進 M2/M3。

- 新增 build:release/check:release、固定 origin 與 M1 public pin、獨立 site + sibling manifest、雙語 head SEO／robots／sitemap／原 headers 保留、完整 allowlist 與 expected-byte 檢查。無參數／錯 mode／多參數拒絕；既有被改／未知／不完整輸出不覆寫，合法重建 no-op。
- 新增 19 個離線 fixture release tests；既有 toolchain test 只改 scratch 路徑到 evidence/m1b，避免寫入舊證據。所有負例僅用任務自有 copy；不做真 root 污染／刪除。
- `node --test test/release.test.mjs` exit 0，19/19。最終透過本輪 process-local wrapper 執行真 npm test/check/build:release/check:release，各 exit 0，**93/93**。官方 npm 安裝不變，子程序明確 hidden／shell:false，使用最小非憑證 child environment、空白本輪 config 與離線模式，不讀帳戶 npm config。原 preview build 未重跑。
- M1B source tree SHA-256 `52b2b7335e52ff6c1ce2e7baf5407762d1135591eae6f9f7bd3064344596f4ca`；site tree SHA-256 `51c54ae8f632976bd26d95e170effeb9a524f84d772f736ecb2cbaa8a9b36fa8`；manifest SHA-256 `347cc3fc0e83f40a761b250dc12e6aa954d288981b440c92f28af4ce59059711`。
- guard 前後完整 User/Machine fingerprint／PATH／TEMP/TMP 相同。原 protected inputs 逐檔不變。所有新證據只放 evidence/m1b；未碰舊 M1 manifests/logs/ZIP。
- 不開 browser/CUA/IAB/CDP/native/server，不操作桌面輸入／clipboard，不讀憑證、安裝、GitHub、部署或共享檔案；無新 chat/子代理。真 browser／Network／Storage 等仍 NOT_RUN_USER_FOCUS_INCIDENT。交主代理回收獨立驗證，完整說明見 [M1B-RELEASE](M1B-RELEASE.md)。
