# 輪值排班表｜Duty Roster

> M1 本機雙語產品已通過主代理驗收；M2 正式靜態產物及公開來源候選已建立。Cloudflare live、首頁與外部複驗尚未執行。

使用 Node.js 24+，不需安裝依賴。乾淨來源可直接執行 `npm test`（不需建置產物）。產物／發布驗證再依序執行 `npm run build`、`npm run build:production`、`npm run release:check`。`npm run dev` 預覽僅 127.0.0.1:4209；`npm run preview:production` 為 127.0.0.1:5209 的本機 HTTP 模型，並非部署。公開來源目標為 KYStr/glossquote-labs-duty-roster；目前 gate 與限制見 HANDOFF.md。

## 使用者與工作

班級、社團或家庭想在一段明確日期範圍內，按成員名單順序安排每日一位輪值者。使用者設定哪些星期是輪值日、每位成員哪些星期可輪值；若當天沒有候選人，結果必須明列未排日期。

MVP 一句話：**依成員目前順序輪流安排所選輪值日，尊重每人的可輪值星期，並清楚列出所有未排日期。**

主要價值是讓小團體快速建立可檢查的日期清單，並看見每個選擇和缺口。適用範圍是單一名單、單一人數上限、單一輪值序列。使用頻率尚未由實際使用者驗證；本規格假設使用者會在需要時，為一段有限日期範圍建立一次輪值表。

## 難度與依賴

難度中等。主要風險是嚴格輸入驗證、跨閏日日期運算、無候選時維持輪替游標、編輯後即時失效，以及手機上管理最多 30 人的可用星期。

產品是雙語靜態瀏覽器工具。M1 使用 Node.js 24 以上版本、ESM 與 Node 內建模組做開發、測試和建置；不使用外部 runtime、dev 或 test 套件。初次載入需要瀏覽器取得網站靜態檔案，載入後不呼叫外部或同源 API。排班資料只在頁面記憶體中。本機預覽固定使用 127.0.0.1:4209。127.0.0.1:5209 僅供 M2 本機 production HTTP 候選模型驗證；產品不呼叫模型或該連接埠。

## 明確非目標

- 不作為勞務或排班法規判斷，不管理多班、輪班、假期、臨時請假、技能、連續值班上限或交接。
- 不最佳化公平、工時或工作量，不宣稱結果最公平。演算法只依固定名單順序與可用星期輪流選人。
- 不新增抽籤、隨機排序、最佳化、跨日期補排、外部工具呼叫或用其他 Gloss Tools 代替本工具。
- 不做雲端協作、帳號、同步、匯入、資料庫、儲存、遙測、分析、AI/model、外部 API、金流或日曆同步。
- 不保證特定裝置、瀏覽器、剪貼簿權限或下載行為；遇到不支援時必須說明安全可行的下一步。

## 文件閱讀順序

先讀[開始說明](START-HERE.md)與[功能對話契約](AGENTS.md)，再依序讀[產品需求](PRODUCT.md)、[技術契約](TECHNICAL.md)、[介面與 SEO](UX-SEO.md)、[驗收案例](ACCEPTANCE.md)、[任務閘門](TASKS.md)。品牌、工程、隱私、安全、設計與發布的固定要求分別見[品牌文案](docs/BRAND.md)、[工程契約](docs/ENGINEERING.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[設計系統](docs/DESIGN-SYSTEM.md)、[發布契約](docs/RELEASE.md)與[Git 發布安全](docs/GIT-PUBLICATION-SAFETY.md)。狀態由[交接紀錄](HANDOFF.md)、[候選清單](docs/RELEASE-CANDIDATE.md)、[任務紀錄](TASK-ENTRY.md)及 project.json 保存；本 README 不表示任何 gate 已通過。
