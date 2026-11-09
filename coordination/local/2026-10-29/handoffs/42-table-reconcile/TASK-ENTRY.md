# B20-42-M1 · 兩份表格對帳

日期：2026-10-23（Asia/Taipei）。本輪只做 M1，交主代理驗收；不推送、不部署、不開伺服器、不操作瀏覽器或桌面，不另開子代理／chat。

派送要求：gpt-6.1-sol / max；未獨立核實 backend 身分。

已讀：本地 14 份規格、根 AGENTS、安全基線、產品論述、完整家族設計契約。自包含 DESIGN-SYSTEM 與根文件 SHA-256 相同（935d4cca13c22b8a66688c8b83fdf412b448a0ff5c62d816728f510aeee05ada）。使用 frontend-design 作為實作輔助，專案契約優先。

完成定義：原生 Node 24 零依賴核心、離線合成案例、可操作 zh-TW/en 靜態頁、完整 JSON/TXT、取消／失效／清除、preview noindex，test/check/build 通過。真實 browser、Network、Storage、原生、焦點、320px/zoom/讀屏／下載另列 NOT_RUN_USER_FOCUS_INCIDENT。

設計決策：Product App；會計／營運以左右清單、明確欄位配對和四分類結果為主。常用選檔／key／compare／開始／下載可見；trim 於設定揭露。系統字體、暖紙、墨色、單一酸綠主操作。無圖像／外部資源。

桌面：`[文字步驟導覽] [左右選檔 → key/compare 配對 → 開始 → 四分類明細與下載]`。
手機：`[產品/語言] [文字步驟導覽] [左檔] [右檔] [key/compare] [開始] [結果/下載]`；表格僅區域捲動。

環境 guard 起點見 evidence/m1/environment-before.json；僅記錄 hash/type/length/數量，不讀 token。只改本工具 allowed paths。主代理負責單一整合 ZIP，本輪不另打交付 ZIP。

本輪收尾：M1 固定候選完成實作，58/58 離線測試、check、preview build 皆 exit 0；source-set `41a74f8b6f5a26a03e62b41d08e7fcceb301fc762aea8a4d5cceeb804e22ef82`。真 browser／Network／Storage／原生全維持 NOT_RUN_USER_FOCUS_INCIDENT；主代理尚未驗收。詳 [HANDOFF](HANDOFF.md) 與 [驗收矩陣](evidence/m1/acceptance-matrix.md)。沒有跨進 M2/M3。


## B20-RP-42 · M1B 追加（2026-10-23）

已完整讀最新 batch20-release-prep TASK。本輪只做離線 release 準備：固定預定 origin `https://reconcile.glossquote.com`／slug `table-reconcile`，新增兩個 release 命令與獨立候選；不修改 public/dist/M1 evidence、規格或其他工具。

最終 74/74 tests、check、build:release、check:release 全 exit 0。M1B source-set `56f799e67ebf163b7fb50adfa0676168f325b78b0a5209b406bc228e5cda26e2`；release manifest SHA-256 `d018c185ebd4b716881518eb15007462a7cea1793bca09b8ca97e42d28410408`。環境前後一致。

本輪派送要求 gpt-6.1-sol/max，backend 身分未獨立確認。真 browser／Network／Storage／native 保持 NOT_RUN_USER_FOCUS_INCIDENT。未 M2/M3、未推送／部署、未安裝、未開 server／子代理／新 chat。詳 [M1B-RELEASE](M1B-RELEASE.md) 與 [HANDOFF 最新追加](HANDOFF.md)。


## B20-42-M2A · 2026-10-25

主代理已完成 r1 真 browser 核心：28 PASS、0 FAIL/禁止事件，parent-cleanup PASS，12 人工／條件 NOT_RUN 保留。此輪只準備發布來源，不 push/deploy，不啟動 browser/server，不讀憑證或改持久設定。

release 只移除兩語 introduction 的精確候選提示 p；public/dist 仍保留 noindex 與候選文案。新增指定靜態 wrangler.jsonc 與封閉設定驗證，保持所有其餘已驗 M1B release bytes 不變。舊 active M1B 產物完整保存在 evidence/m2a/before-release-artifacts，未碰 evidence/m1、m1b 或 .runs frozen owner／執行證據。

受影響 tests 22/22、check、build:release、check:release 全 exit 0。M2A source-set `9a5d367350f5bcc755fe05f5ef102b78306dd9edbef2408beaa6c97f5bf9ec47`；release manifest `fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c`。正式站未部署／GitHub 未推送／外部待驗。詳 [M2A-RELEASE](M2A-RELEASE.md) 及 [HANDOFF 最新追加](HANDOFF.md)，待主代理審查後 M2B。

## B20-42-M2B／RESUME-42-M2B-CLOSE · 2026-10-27

原 M2B 2026-10-25 已成功發布公開 [KYStr/glossquote-labs-table-reconcile](https://github.com/KYStr/glossquote-labs-table-reconcile)，source／reviewed copy／main commit `35d4dc295459824dd27c924b13d941a606625170`。發布前依追加授權只將 compatibility_date 與 validator／test 改為 `2026-10-24`；新 source-set `c49494930c7fe8e5df00384a53dfe031b40e71faded1de7f5a171a884650c8b3`，release manifest 仍為 `fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c`。

本次只補中斷後交接、原實際命令總表、公開 API／59 檔 bytes／固定 33 檔來源／13 資產比對及結束環境 guard。全部符合；原始與復工前後完整 Windows Snapshots／Git fingerprint 一致。22/22 相關測試及 check／release build／check 已在同 bytes 副本通過，未重跑未變範圍。新增 [M2B-PUBLICATION](M2B-PUBLICATION.md)、`evidence/m2b/` 追加證據與 HANDOFF 最新狀態；沒有改公開 commit、舊 M2A frozen manifest 或 runtime。

狀態 PUBLIC_SOURCE_VERIFIED；hosting／首頁未執行、外部待驗，原 browser 28 PASS／12 NOT_RUN 保留。未 browser／native／OS 輸入／server／部署／首頁／另委派／新增 ZIP，未讀取憑證值或改持久設定。原公開 HANDOFF 已包含必要狀態，不需附加 commit。詳 [本輪驗證](evidence/m2b/resume-verification.json)、[命令總表](evidence/m2b/execution-ledger.json)、[環境比較](evidence/m2b/environment-comparison.json)。

## B20-42-M2C · 2026-10-27 固定入口 redirects

主代理發現既有部署 version `df67676d-ed8e-430b-9557-9405c840f271` 的 `/` 與 `/en/` 404，live gate 不通過。已核對 Cloudflare 官方語法，保留 `html_handling:none`、canonical／runtime／HTML／CSP，只在 release generator 加入三個固定 301 規則到 `_redirects`，並擴充封閉清單、精確 manifest／output、竄改拒絕與重建測試。

24/24 相關 tests、source check、release build／check 全 exit 0。新 source-set `2227cedcc178331732f49827ca8c8d2e3fb32bb54d431e1717d21f22d789a932`；release manifest `12271529426c0330d063d0fb93cbc66575bc9ec8bdfe0185c9fe051f2051f2c8`，14 assets／78,391 bytes，原 13 資產不變。原完整 release 已保留於 `evidence/m2c/before-release-artifacts`，manifest `fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c` 不變。只改本工具 scripts/release.mjs、test/release.test.mjs、追加 HANDOFF／本紀錄、新產物與本輪 evidence。

狀態 OFFLINE_FIX_READY_FOR_PRIMARY_REVIEW；沒有 push／部署／browser／native／OS 輸入／server／首頁／另委派／新增 ZIP，未讀憑證或改持久環境／全域 Git。主代理審查後再發 M2B 補丁 push，後續實站 301／Location／canonical 200／headers／bytes／無迴圈仍待驗；外部待驗，原 browser 28 PASS／12 NOT_RUN 保留。詳 [M2C 報告、diff 與執行證據](evidence/m2c/REPORT.md)。

## B20-42-M2B 補丁發布 · 2026-10-27

主代理獨立通過 M2C 後放行來源補丁。已由既有公開 main 建立新 reviewed publishing copy，固定來源與完整 test tree，再以完整必要命令驗證、提交、建立潔淨 clone 重驗，正常推至原公開儲存庫。source／reviewed／remote commit `ce9a9260bac2d8ffd31fb5710de946b4996d1ef7`，父提交 `35d4dc295459824dd27c924b13d941a606625170`，59 個追蹤檔包含全部 11 個實際 test 檔／synthetic helpers 與必要 fixtures，歷史未改寫。

兩份副本各 82/82 tests、check、preview build、release build／check 全 exit 0。source-set 仍 `2227cedcc178331732f49827ca8c8d2e3fb32bb54d431e1717d21f22d789a932`，release manifest 仍 `12271529426c0330d063d0fb93cbc66575bc9ec8bdfe0185c9fe051f2051f2c8`。GitHub API／remote ref／public／59 blobs 相符，Git guard 與完整 Windows Snapshots 前後一致；只用既有 CLI 認證，未讀憑證值或改持久設定。

狀態 PUBLIC_SOURCE_PATCH_VERIFIED；本輪未部署／首頁／browser／native／OS 輸入／server／另委派／新增 ZIP，原 browser 28 PASS／12 NOT_RUN 保留，舊實站入口 gate 與外部驗收仍待主代理後續。完整副本路徑、收據／固定 commit 每檔 SHA／命令與 guard 見 [補丁發布報告](evidence/m2b-patch-2026-10-27/REPORT.md)。
