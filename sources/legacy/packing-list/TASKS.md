# 任務與里程碑：行李清單與重量試算

狀態：SPEC_ONLY；目前未實作。每個任務依序執行，失敗先修此任務，不勾選後續。所有程式修改只在本專案資料夾。

## M1 / T00：本機可操作雙語 MVP

前置：讀完本資料夾 PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、docs/ENGINEERING、docs/PRIVACY-SECURITY、docs/DESIGN-SYSTEM；先確認 Node >=24。長測試/建置前後遵循 docs/ENGINEERING Windows guard。記錄初始狀態；若有其他人正在改同路徑就停止。

允許路徑：public/**, scripts/serve.mjs, scripts/check.mjs, scripts/build.mjs, scripts/validation.mjs、本工具必要 scripts/*.mjs helper、test/**（僅假資料）、package.json、.gitignore、本工具產生的 dist/**。交付紀錄允許更新本工具 HANDOFF.md、project.json、START-HERE.md、docs/RELEASE-CANDIDATE.md，並在 TASK-ENTRY.md 追加專用證據。不可改其他工具、根首頁、父索引、Git root、發布來源、外部帳號或憑證。

1. 建 private ESM/Node24 scaffold、loopback-only safe server 127.0.0.1:4202、真 check/build/test；不得先執行不存在的 scripts。
2. 實作純 core API、schema v1、數字 grammar、100-row/quantity/weight summary，先完成 A01–A40 與負例測試。
3. 做雙語單頁清單、篩選、摘要、範例與確認、重置、JSON preview/import/export、取消/失效狀態；編輯欄位以 textContent 安全呈現。
4. 增加完整邊界、stale import/request id、pagehide/object URL cleanup、loopback/allowlist/toolchain 測試；M1 不作正式 SEO/headers。
5. 啟動本機服務，人工完成 B01–B08、B11；B09 的 200% zoom、B10 Network/Storage 可依工具能力分項 NOT_RUN。B08 的 320px 必須實測。B06 的原生下載與 file picker 若環境不能操作，逐項記 NOT_RUN；測試 API mocks 不可冒充 PASS。
6. 最終一次執行 npm test、npm run check、npm run build；記錄 exit code、Node版本、manifest/hash、真實 browser 案例及 NOT_RUN。凍結交主代理，不自動進 M2。

M1 gate：A01–A40、npm test/check/build 與 required toolchain gate PASS；B01–B08、B11 的真實瀏覽器證據完成，涵蓋雙語清單、未知重量下限、篩選/範例/匯入預覽取消與確認、鍵盤、320px 及刷新提示。B09 zoom、B10 Network/Storage 可在工具能力不足時分項 NOT_RUN；B06 原生 download/file picker 也可在設備不足時分項 NOT_RUN，不能以 mock 宣稱人工通過。Windows environment guard 前後相同。主代理未放行前不得做 M2。

## M2 / T01：正式 SEO、安全產物與公開來源

前置：主代理讀差異並明確 M1 放行。允許本工具 public/**, scripts/** 中 release/build/check/manifest helper, test/** release tests, package.json, wrangler.jsonc, .gitignore, docs/RELEASE.md, docs/RELEASE-CANDIDATE.md、專用 publishing copy evidence。必須與 M1 reviewed copy 分開、核對路徑。

補正式 canonical/hreflang/x-default/robots/sitemap/JSON-LD、404、headers、production origin allowlist，增加 production build/check/release 檢查；確認靜態輸出不含 tests/docs/inputs/secrets。先驗 fixed blob source ZIP 可重建，必要 check 通過後依發布契約建立或更新 KYStr/glossquote-labs-packing-list public repo，驗 remote visibility/commit/ZIP bytes；不 force，不 deploy、不碰首頁。無法驗證或權限異常停止回報。

## M3 / T02：主代理部署、首頁與外部驗收

只由主代理控制正式 Cloudflare 與首頁序列整合。功能對話不得改首頁、部署或把 draft 標為 published。主代理 live 驗證後才公開首頁項目；交付標示「已上線，待外部複驗」。收到外部報告後由本工具原對話按具體問題修改 own paths、重測與 republish；主代理重新部署驗證。未有外部確認不得標完成。
