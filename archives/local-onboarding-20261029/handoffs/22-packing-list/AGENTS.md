# 行李清單與重量試算專案規則

狀態：SPEC_ONLY。本檔是此獨立 feature 專案的可攜規則；沒有產品程式交付。

- 先讀 START-HERE、TASKS、PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE 及 docs/。每次只做目前里程碑。
- M1 只建立本機可操作靜態 MVP；前一 gate 未通過不開始下一 milestone。不得因文件或範例存在而聲稱產品已驗收。
- 允許修改路徑以 TASKS 的當期 allowlist 為準。保留其它工作與未追蹤檔案，不清理、不改兄弟資料夾/root首頁。
- 資料全部在目前分頁記憶體。不得新增 localStorage、IndexedDB、cookie、URL sync、帳號、網路、telemetry、外部字體/CDN、runtime dependency 或 server-side processing。
- 數量、克數、summary 使用安全整數；重量 null 與 0 語意不同。所有 schema v1 import 欄位精確拒絕未知值，導入先 preview 再確認，不部分套用。
- 使用者名稱及匯入內容是不可信純文字；DOM 只用 textContent/value。錯誤訊息不得吐原始備份內容、路徑或例外。
- 測試離線、使用合成資料；只對純函式/靜態工具鏈宣稱自動測試。原生下載、檔案選擇與真實瀏覽器行為需親自操作或標 NOT_RUN。
- Node 必須 >=24，ESM、Node built-ins；dev server 僅 loopback 127.0.0.1:4202 和 public/**。
- 遵守 docs/ENGINEERING Windows 保護規則；不得修改持久環境變數/registry/PATH/TEMP/TMP。禁止讀取憑證。不得在根 repo checkout/reset/clean/stash/commit/push。
- 主代理才負責正式部署、首頁與跨產品整合。每個狀態需用 HANDOFF/TASK-ENTRY/project.json 真實記錄；M2公開來源只在主驗放行後照 RELEASE 契約。
- 此工具僅整理使用者輸入與做克數加總，不代表航空公司政策或登機建議。
