# 成績目標試算（Grade Target Calculator）

狀態：**規格，尚未實作。** 本資料夾目前是 M0 文件；沒有產品程式、測試結果、固定版本、公開來源或正式網址。

## 使用者與工作

使用者已拿到部分成績，想知道尚未評分項目合計至少要有多少加權平均，才會達到自訂目標。這是個人試算，不代表學校、課程或老師的官方計分規則。需求頻率是待驗證假設，不是已證實需求或搜尋量。

MVP 一句話：輸入目標、各項百分比權重、已評成績，查看已取得的總成績貢獻、剩餘權重、剩餘項目所需的加權平均或目前可達上限。

所有分數是 0–100 百分制，權重是總和恰為 100% 的百分比；不是金額、GPA、學分或學校成績預測。空白成績代表尚未評分，和輸入 0 分不同。

## 使用環境與假設

- 初版提供繁體中文與英文。繁中頁為 /index.html，英文頁為 /en/index.html。切換語言前會說明，確認後清除表單並前往另一語言頁。
- 適用桌面鍵盤、觸控平板及手機；最多 40 項必須能在 320 CSS px 寬度下操作。手機小數鍵盤可能顯示逗號，介面要提供鍵入 ASCII 句點的方法和格式提示。
- 預覽服務只綁定 127.0.0.1；M1 預覽用 4208。5208 是 M2 production-like 本機 HTTP model 的候選埠，只供驗證標頭與路由，試算核心不連線至它。
- 初次載入仍會下載靜態 HTML、CSS、ESM；載入後試算在目前頁面同步完成。沒有外部 API、模型、儲存、資料匯入、帳號或遙測。重新載入或離頁後不能恢復草稿，也不承諾冷啟動離線可用。
- 使用頻率、實際裝置、使用者對分數顯示精度的理解皆尚待驗證。

難度：中。主要風險是精確十進位邊界、加權平均的文字表達、長表單和瀏覽器複製／下載生命週期。執行時不加套件；Node.js 24+ 與 built-ins 僅供本機開發、檢查、建置和離線測試。

## 非目標

- 不重建任何學校的加權、類別、曲線、補考、作業丟棄、加分或及格規則。
- 不把剩餘加權平均說成每項都必須達到的分數，也不保證使用者一定能取得該成績。
- 不換算 GPA、學分、等第、金額或其他滿分制。
- 不連接校務系統，不上傳、保存、同步、讀取或匯入使用者資料；沒有帳號、模型、推薦、通知或聯絡功能。
- 不承諾冷啟動離線或所有瀏覽器皆支援剪貼簿。

## 閱讀順序

1. [PRODUCT.md](PRODUCT.md)：使用情境、需求、輸入與結果語義。
2. [TECHNICAL.md](TECHNICAL.md)：精確 schema、算式、狀態及資源清理。
3. [UX-SEO.md](UX-SEO.md)：雙語頁面、文案、裝置版面及 SEO。
4. [ACCEPTANCE.md](ACCEPTANCE.md)：可重現的核心與瀏覽器驗收案例。
5. [TASKS.md](TASKS.md)：M1–M3 有界任務和 gate。
6. [START-HERE.md](START-HERE.md)、[AGENTS.md](AGENTS.md)、[HANDOFF.md](HANDOFF.md)：開工入口、原功能對話契約和實際交接紀錄。
7. [docs/BRAND.md](docs/BRAND.md)、[docs/ENGINEERING.md](docs/ENGINEERING.md)、[docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)、[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)、[docs/RELEASE.md](docs/RELEASE.md)、[docs/RELEASE-CANDIDATE.md](docs/RELEASE-CANDIDATE.md)、[docs/GIT-PUBLICATION-SAFETY.md](docs/GIT-PUBLICATION-SAFETY.md)：本工具共用契約和發布邊界。

M0 只交付規格。後續狀態和證據以 HANDOFF 與 RELEASE-CANDIDATE 為準；不得把規格案例當成已通過的實測。
