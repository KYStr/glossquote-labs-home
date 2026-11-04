# B20-60-M1 任務紀錄

2026-10-23；僅 M1，原功能對話。Requested `gpt-6.1-sol/max`，backend 身分未獨立確認，未切換模型、未委派或另開 chat。

已讀本工具 14 份文件（AGENTS、START-HERE、README、PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、TASKS、HANDOFF 與 docs 五份），根 AGENTS、SECURITY-BASELINE、PRODUCT-THESIS 與完整 GLOSS-TOOLS-DESIGN-SYSTEM。本工具 DESIGN-SYSTEM 與共通版本 bytes/SHA 相同。設計輔助使用本機 frontend-design SKILL，專案規格優先。

完成條件：真實 CSV→明確 mapping→全部逐人預覽/重複提示→vCard3 bytes/手動下載實作；A01–A20 純核心與生命週期離線證據、Node24 test/check/build；固定 source bytes/SHA。B01–B05 全留 NOT_RUN_USER_FOCUS_INCIDENT，M1 候選不視為完整產品驗收或公開版本。

模式 Product App；使用者為活動主辦人，主要物件是目前聯絡人名單，風險是錯誤映射/個資外送/舊輸出。核心操作常駐；備註用原生 details 展開。無假資料列、遠端資源、帳號、storage 或上傳。

桌面：精簡 topbar；左欄 CSV/五個 mapping/預覽動作；右方主要畫布顯示全部聯絡人與相鄰下載動作。
行動：有標籤的 CSV 與欄位 / 聯絡人預覽切換；每人直向姓名/電話/email/組織/備註；功能均可返回。

當次明確禁止啟動 server，故只以無 listener 的 request-handler 離線測試驗證路由邏輯；`npm run dev` 實際 listen/HTTP 標 NOT_RUN_TASK_NO_SERVER，不以 handler 測試冒充 HTTP 通過。無 browser/CUA/IAB/native/剪貼簿/OS dialog 操作；不安裝、不讀憑證、不 Git publication/部署。

實作依 T00→T01→T02→T03→T04→T05→T06→T07→T08 順序；實際命令、失敗/修正與凍結清單見 HANDOFF 及 evidence/m1。

## 2026-10-23 — B20-RP-60 / M1B

已完整讀 `.runs/batch20-release-prep-2026-10-23/TASK.md` 最新契約並對照既有 M1 程式與來源雜湊。本輪只做離線 release tooling；public/dist/舊 evidence 先 capture 完整 bytes/SHA baseline 並於結束比對。此次任務允許的 package/.gitignore/scripts/test/HANDOFF/TASK-ENTRY/M1B-RELEASE/evidence/m1b/release-artifacts 為唯一修改範圍。

固定 origin `https://contacts.glossquote.com`、toolSlug `contact-cards`，加入嚴格 build:release/check:release 與獨立 site/manifest。來源 lock 依已凍結 M1 public 逐檔 hash，避免把可一起竄改的 manifest 當信任根。21 個新增針對性 tests 在 task-owned copies 執行，不對真 public/dist 做負例。

明確不做 browser/CUA/IAB/native/CDP/焦點/IME/clipboard/OS dialog/隔離試驗/server；不安裝、不付費、不讀憑證、不 GitHub、不部署、不改共享狀態或開 chat/子代理。Requested 模型仍為 gpt-6.1-sol/max，未自行切換、不自述驗證 backend。最終一次完整 suite/check/build:release/check:release 與 envguard/evidence 見 M1B 交接；未變 preview 不重建。

## 2026-10-27 — B20-60-M2A

root H2 focused b20-60-r2取得10PASS/0FAIL、prohibited空、parent cleanup PASS；以language+caseID覆蓋r1原8失敗，合計34PASS/10NOT_RUN，privacy不重複計數。本輪不自行browser驗收。

依最新指令允許本工具及owner-60-release：先嚴格驗證舊M1B output、完整104檔source/evidence archive與byte/SHA比對，再將已核對release目錄精確rename入archive，沒有delete/force。新建固定assets-only wrangler、三列301_redirects、正式HTML精確移除candidate前綴、configFiles digest與反例測試；public/runtime/CSP/核心/輸出不變。

本輪使用Cloudflare workers-best-practices技能的設定核對流程，讀既有Wrangler4.147 schema與官方docs；使用者明確日期2026-10-24及所有observability/metrics false優先。不執行Wrangler CLI、dry-run、push/deploy、首頁整合、credential或持久Windows/Git變更，不再委派。原證據及外驗待驗範圍保留。最終test/check/build/build:release/check:release獨立命令與環境完整Snapshots記owner限定目錄，root驗收後才M2B。
