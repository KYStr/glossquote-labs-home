# B20-44-M1 任務進入紀錄

- 工作日：2026-10-23（Asia/Taipei）。範圍：本工具 M1 T00 → T50。
- 完成條件：可操作繁中與英文靜態候選，嚴格 CSV／欄位映射／揀貨裝箱／當頁核對／TXT 與 JSON 輸出；離線 Node、check、build 有實際證據；固定來源清單與雜湊交主代理。
- 已讀：根 AGENTS、安全基線、產品論述、完整家族設計契約，以及本工具 14 份規格與契約。工具內設計契約為相同內容。
- 只修改 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。原有規格／docs 不改。
- requested configuration：gpt-6.1-sol / max；實際 backend 身分未獨立驗證。
- 不開 server/browser，不做 CUA、桌面、隱藏 IAB 或截圖；不委派、不開新 chat、不跨 milestone；GitHub、hosting、homepage 均待後續放行。
- 設計輔助：frontend-design；專案設計契約優先。Product App 模式，以揀貨與裝箱清單為主要畫布；先匯入與映射，再顯示結果，來源設定可收合但仍可找到。
- 主體：桌面為單一寬工作表（來源摘要與欄位映射在前，總揀貨表與逐單裝箱在後）；手機同序直排、必要表格有具名內部捲動區。沒有裝飾性側欄。

```text
desktop: [家族 / 工具                 語系 / 首頁]
         [H1 / 本地資料說明] [狀態]
         [CSV 來源、範例] → [兩列樣本與四欄映射] [產生清單]
         [SKU 總揀貨表 / 勾核] [逐單裝箱表 / 勾核]
         [頁面核對進度 / TXT / JSON] [說明]
mobile:  [工具 / 語系]
         [CSV] [樣本橫捲] [映射直排] [產生]
         [總揀貨橫捲] [逐單清單] [下載直排] [說明]
```

例外與解讀：數量先以 BigInt 驗證與加總，確認 ≤1,000,000,000 後才轉為 JSON number，符合 PRODUCT 的 schemaVersion 1 範例；顯示使用十進位及語系數字格式。A16 的十億上限超出合法 CSV 5,000×100,000 的可達總量，使用合成直接核心輸入另測聚合防線，不放寬 parser 限制。

## B20-44-R01 主代理修正指示

原 M1 凍結暫停。主代理確認 quoted multiline CSV 的品名能在 TXT 造成偽造 SKU／訂單區段。修正範圍為所有 TXT 來源字串（SKU／name／orderId）採可逆單行 JSON quoting，JSON 保留原文；介面結構不變，下載說明補雙語表示法。此明確指示優先於 PRODUCT 早先對 TXT 原字串直接顯示的描述，不修改原規格文件。補實際 serializer newline／CRLF／tab／quote／backslash 與 Unicode line separator 還原測試，重驗並在 evidence/m1/r01 重新固定；原來源 44 檔先逐 byte／SHA 驗證後保留，無 browser／OS／server／發布／部署／委派。

## B20-RP-44：M1B 離線發布準備

已完整閱讀 .runs/batch20-release-prep-2026-10-23/TASK.md 的十項契約；本輪優先於較早 M1 allowed paths。只改自己的 package.json/.gitignore/scripts/**/test/**/HANDOFF.md/TASK-ENTRY.md/M1B-RELEASE.md/evidence/m1b/**/release-artifacts/**。public、dist、舊 evidence/m1 與原規格不改；不 browser／CUA／IAB／CDP／OS／server／委派／新 chat／發布／部署。零依賴 Node24，固定 origin https://picklist.glossquote.com，toolSlug order-picklist。

完成條件：build:release／check:release、獨立 site 與 sibling manifest、雙語正式 SEO、確定性／污染拒絕、SOURCE_PINS 防來源與 manifest/asset 同步竄改、最終完整 npm test/check/build:release/check:release、環境前後一致與新固定來源／產物雜湊。既有 R01 產品/runtime 驗收維持歷史，不把本輪 suite 或離線模型計為 browser PASS。

## B20-44-M2A：正式發布來源準備

2026-10-25。根 AGENTS 與 Git-publication safety 已讀。主代理已完成 M1B 真隔離 browser 核心：30 PASS／10 NOT_RUN；life2 補驗2 PASS且四 mapping 清空，0 FAIL／prohibited，cleanup PASS。人工與精確 race/zoom/boundary 保留 NOT_RUN。這是既有主驗證據，本輪不啟動 browser／服務，不讀憑證或變更持久環境／Git/auth，不委派。

僅本工具修改；evidence/m1、m1b、owner-44-browser 與舊執行資料保持原 bytes。所有新證據／test copies 寫 evidence/m2a。正式 HTML 僅精確替換原 banner 的文字，保留所有其餘 body、runtime、SEO；preview 不動。新增指定 assets-only wrangler.jsonc，無依賴或 Worker 程式。舊 managed release 驗證後保存在本輪目錄再 fresh build；不放寬未知輸出保護。受影響 release suite/check/build/check release 與環境前後比對通過後交回 root；未獲 M2B 不 push/deploy。

主代理後續精確更正：compatibility_date 使用2026-10-24（不是台北工作日10-25），避免future UTC date。只改正式config與其oracle及交接描述，舊設定／來源／證據先固定保留；只重驗受影響config case，既有release與runtime bytes不變。

## B20-44-F03：directory-link 測試清理可攜性修正（2026-10-27）

主代理依新外部驗收 F03 指定回原功能對話修正。已讀指定 findings、developer handoff 與候選 diff，僅作證據；不直接套用其他工具／封裝修改。只改本工具 test/release.test.mjs、必要同目錄 test/helper、HANDOFF／TASK-ENTRY，所有新證據與測試副本限 evidence/f03。public、runtime scripts、dist、既有 release-artifacts 和歷史 evidence 不改；保留 PUBLIC commit 9d715f17686e95f76ca97192b7eca79dd72fc3a4 的原證據。

完成條件：helper 核對 owned path、lstat 為連結及預期真目錄 target；Windows junction 只用 rmdir，POSIX symlink 只用 unlink，不遞迴刪 target。保留原產品拒絕 oracle 與空 target 案例，加 target 哨兵／內容不變與誤傳普通目錄／檔案／越界／不匹配 target 的拒絕回歸。完整 npm test 和 check 在 evidence/f03 的逐檔固定副本執行，因既有 release 工具只允許自身 evidence/m2a/fixtures；副本內產物仍全部位於 f03，不寫入凍結證據。前後環境 guard、原 public/release bytes 與限定 diff 必須通過。Windows 與 POSIX 實跑分開記錄，未執行平台標 NOT_RUN；不把外部候選結果當整合版 PASS。

本輪不 push／部署／另包 ZIP／委派，不互動本機 browser／桌面／鍵盤／IME／clipboard／dialog，不讀憑證或更改持久環境／Git／gh 認證。完成後交主代理獨立驗證，待另行放行才更新原公開 repository。

## B20-44-M2A-R02：固定發布入口轉址（2026-10-27）

依主代理新增指示，先固定已完成的 F03 candidate，再於獨立 evidence/m2a-r02 修發布入口。html_handling:none 保持原契約，generator／site allowlist 增加固定 _redirects：`/ /index.html 301`、`/en /en/index.html 301`、`/en/ /en/index.html 301`，恰三行 LF 並含尾端 LF。manifest 必須涵蓋該檔，缺檔、規則改動或與 manifest 同步污染均拒絕，不修補／覆寫已污染產物。canonical／index.html、public／dist／runtime／CSP／Wrangler config 不改。

只改自己的 scripts/tests/docs/evidence 與已管理 release-artifacts。上一版15份 release 先核閉合集合與 bytes／SHA，再於本工具內完整保存在 evidence/m2a-r02/release-before，之後 fresh build。F03 evidence 全部凍結；本輪測試副本只寫 m2a-r02。驗證最終受影響 release suite、check、build:release／check:release、精確新舊 artifact diff、前後完整環境快照，未變核心與既有 browser 不重跑。只做離線修正，實際 HTTP redirect／Wrangler routing 待主代理後續 release 驗證；未放行前不 GitHub／push／部署／首頁／共享看板／browser 或原生互動／委派／讀憑證／持久設定。
