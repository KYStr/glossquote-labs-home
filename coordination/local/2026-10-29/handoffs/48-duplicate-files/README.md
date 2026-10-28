# 重複檔案找出來 / Find duplicate files

**候選 slug：** duplicate-files  
**候選 domain：** duplicates（候選值，須由主代理另行驗證）  
**規格狀態：** 尚未實作。本文不是功能完成或 browser 驗收報告。

這是給整理備份、照片與附件的人使用的本機工具。選取一批檔案後，工具先按檔案大小和 SHA-256 分組，再對候選組逐 byte 比較，避免單靠 hash 宣稱內容相同。使用者可在每組中選擇保留哪個來源；預設保留最早選取的檔案。工具提供 JSON 和 TXT keep/duplicate 清單，絕不刪除或改寫來源檔。

M1 上限是 200 個檔案、合計 128 MiB、單檔 32 MiB。空檔有效。所有分析在目前分頁記憶體完成，沒有上傳、帳號或持久儲存。難度中等，重點是取消、來源變更失效、hash collision 防護和安全呈現不可信檔名。

M1 需交付真正可操作的中英雙語 candidate、Node 24 離線 tests/check/build。此規格工作尚未實作產品，Node gates 和 browser checks 都是 NOT_RUN；browser 操作依共同工作區契約保持 NOT_RUN_USER_FOCUS_INCIDENT。

非目標：自動刪除/移動/重新命名檔案、雲端備份、影像相似度、內容預覽、檔案上傳、壓縮、使用檔名判斷重複、或只依 SHA-256 斷定相同。閱讀 PRODUCT.md 取得 FR 和資料 schema；TECHNICAL.md 定義精確 hash/byte compare；UX-SEO.md 定義工作區和雙語文案；ACCEPTANCE.md 是 oracle；TASKS.md 是 M1 順序。共同要求見本目錄 AGENTS.md、START-HERE.md、HANDOFF.md 及 docs/。
