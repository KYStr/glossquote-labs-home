# 專案期限倒排 — 驗證範圍

**SCOPED OFFLINE PASS；未發布、非完整 release acceptance。**

## 既有證據

- 精確候選：`glossquote-project-backplan-candidate-20261028`。
- 作者結果：63/63；獨審另重播作者 suite。
- 獨立驗證：34/34 reviewer-written 群組；最後文件／HTML／CLI／build 變更另重跑受影響 9/9。包括 317 排程、2008 日期、80 排列 fixtures、13 受控 app、6 實際 loopback HTTP 群組與 4 個破壞邊界 probes；重疊結果不加總成獨立行為。
- 原 source manifest：`a03284cc271441c8c71a5f81e3534d2d21c96b066edba00644d287557bb07737`；本輪重新比對全部 25 條，無差異。
- 原 reviewer receipt 的 SHA-256：`fa2b7b7e6408643505a96a813f0fdf7b700c2030b79d5ff94f286d27bf029e32`。原始 receipt 含內部作業資訊，故本包只帶此整理摘要及內容身分；不是重新出具獨審。
- 既有 public/dist 共 8 個檔案逐 byte 相同，preview 完全取自該 dist。

## 交付輪實際範圍

只整理文件／封包；不變更 package/public/scripts/test。文件替換不套用舊文件 SHA，交付 MANIFEST 另外列所有實際 bytes。Fresh-copy check/build 是交付結構檢查，不是獨審或產品 tests 重播。最終 ZIP 的 fresh extract、路徑／CRC／manifest／逐 byte 比對結果在 ZIP 外的 PACKAGING-VALIDATION.json。

## 尚未完成

既有獨審包含實際 loopback HTTP，並非原生 GUI。渲染、鍵盤、剪貼簿／下載與真 BFCache 仍 NOT_RUN。

共同 NOT_RUN：320px／200% 原生渲染、實體手機與輔助技術、完整 Network/Storage、正式 SEO/indexability、實際發布與上線驗證。沒有執行任何 GUI、CI、外部上傳、推送或部署。作者 GUI 不當作獨審。

本候選僅記憶體處理輸入；明確匯出檔案仍由瀏覽器與使用者管理，清除頁面不保證撤回已開始下載。測試資料為合成資料，不含真實聯絡人、錄音或行程。無新增 license。
