# U02 — 從知道JSON有錯到直接修正錯誤位置

主代理新需求，2026-10-12；這是可用性新增，不是宣稱舊驗收有錯。使用者授權讓原功能對話改善實際工作流程；本文件規格就緒，需主代理實際派發U02後才開工，不能自啟其他里程碑。

## 目標與現況

現有public/js/app.mjs顯示lexer提供的行、欄、offset，使用者仍需在長textarea自己找位置。新增錯誤旁「前往錯誤位置 / Go to error」，明確手勢將焦點與插入點移至當前已驗證錯誤offset，方便立即修字。保留所有格式化、精確number token、duplicate key、Worker與大小/深度限制。

## 一個有界里程碑

- 只在目前來源的error含有效整數offset且0≤offset≤source.length時提供可操作按鈕；null、未知/無位置錯誤不顯示或不可用。
- 按下才focus source並setSelectionRange(offset,offset)，盡可能讓插入點可見；不改文字、不自動修復、不重排、不自動重新檢查、不在Worker回報時搶焦點。
- offset沿用UTF-16與實際textarea.value座標；EOF=length可定位，不越界、不自行猜第一個duplicate key。來源/模式/清除/取消/重跑立即失效舊offset，遲到Worker不可恢復舊按鈕。
- 本版維持原生textarea、不引編輯器套件，不添加上傳、持久儲存、網路或剪貼簿讀取。兩語按鈕/使用說明/錯誤可及性完整，保留現有SEO及同語首頁。

## 驗收

1. `{"a":}`：既有parser錯誤offset=5，按鈕定位5，source文字逐字不變。
2. `{"a":1`：EOF offset=6，定位6；合法JSON沒有跳錯誤按鈕。
3. `{"😀":}`：定位既有offset=6，不能將UTF-16位置當碼點索引。含多行/CRLF貼入以textarea實際值及lexer位置核對。
4. `{"a":1,"a":2}`：定位既有parser回報的第二個鍵位置；不改duplicate-key規則。
5. 先錯誤，再編輯成其他來源／模式切換／清除／取消／重跑，舊跳轉立即失效；NULL-offset錯誤無按鈕；無效offset防守拒絕。
6. 真Chrome兩語錯誤→點擊/鍵盤→caret→修正→成功完整流程；長文本錯誤所在行可見。聚焦/selectionStart/End可讀DOM佐證，Node mock不能代替真UI。
7. 相關focused tests與專案原npm test/check/preview/release gates依package實際命令通過，不削弱已批准的JSON安全與精度案例。所有相關輸出保持原有export/race規則。

## 委派契約

原對話01a12398-e316-7d33-b7a5-fc1a2b9ce09b，明確Sol/max；不再委派。允許本工具public/**、test/**、必要scripts/check/build與PRODUCT/UX-SEO/ACCEPTANCE/TASKS/HANDOFF/docs及既有本工具發布副本；主代理不並行改產品。先讀根及本工具AGENTS/current HANDOFF。只用假資料；專用證據.runs/json-outcome-2026-10-12/，不動別的工具/首頁，不讀憑證或部署。

完成必要gate後PUBLIC更新既有GitHub並核對remote commit/visibility、固定source ZIP/manifest、交接可用本機網址與改檔/命令/exit/NOT_RUN/已知風險、釋放所有權。主代理獨立驗收與正式發布，新版待外部覆核，不繼承舊版通過。遇需要新依賴/權限/無法確認offset語意或兩輪無進展，具體停止回報。

## 2026-10-13 實際派發與實作記錄

主代理已實際派發U02-ERROR-LOCATION-20261013，沿原功能對話實作，不另委派。已完成定位資格、原生caret動作、兩語說明與可見區捲動；focused3例與Chrome兩語22例＋320px2例已通過。完整gate、公開source／ZIP／guard與釋放所有權結果見HANDOFF本任務追加，舊「需派發才開工」文字保留為派發前歷史。
