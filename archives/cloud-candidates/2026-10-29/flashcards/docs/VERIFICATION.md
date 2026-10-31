# 問答卡 r3 — 驗證範圍

**SCOPED OFFLINE PASS；未發布、非完整 release acceptance。**

## 既有證據

- 精確候選：`glossquote-flashcards-candidate-r3-20261028-1941`。
- 作者結果：76/76；獨審讀取作者終態，未宣稱重跑此 suite。
- 獨立驗證：7/7 core、13/13 受控 app、17/17 r3 build probes、5 項 static。r3 的 8 runtime 檔與 r2 完全一致，所以沿用精確 byte 身分下的 core/app 證據，不重跑或重複計數。
- 原 source manifest：`fe8956eb8ab97e6ed165db9f8b68dcde96eeef2f68acb948a9d8822039766f15`；本輪重新比對全部 26 條，無差異。
- 原 reviewer receipt 的 SHA-256：`43d551bd6f64042d9fbc2158eeede9a0c99d80d708ffe55501934b4a053ec150`。原始 receipt 含內部作業資訊，故本包只帶此整理摘要及內容身分；不是重新出具獨審。
- 既有 public/dist 共 8 個檔案逐 byte 相同，preview 完全取自該 dist。

## 交付輪實際範圍

只整理文件／封包；不變更 package/public/scripts/test。文件替換不套用舊文件 SHA，交付 MANIFEST 另外列所有實際 bytes。Fresh-copy check/build 是交付結構檢查，不是獨審或產品 tests 重播。最終 ZIP 的 fresh extract、路徑／CRC／manifest／逐 byte 比對結果在 ZIP 外的 PACKAGING-VALIDATION.json。

## 尚未完成

原生 GUI／Crypto 實作／下載／列印／IME／BFCache 及實際 hosting 均 NOT_RUN。

共同 NOT_RUN：320px／200% 原生渲染、實體手機與輔助技術、完整 Network/Storage、正式 SEO/indexability、實際發布與上線驗證。沒有執行任何 GUI、CI、外部上傳、推送或部署。作者 GUI 不當作獨審。

本候選僅記憶體處理輸入；明確匯出檔案仍由瀏覽器與使用者管理，清除頁面不保證撤回已開始下載。測試資料為合成資料，不含真實聯絡人、錄音或行程。無新增 license。
