# 任務單：食譜份量換算 M1/T00

任務 ID：RECIPE-SCALER-M1-T00。狀態：IMPLEMENTATION_FROZEN_PRIMARY_PENDING；本機實作驗證通過，主驗尚未執行。

## 目標與背景

使用者要把食譜放大或縮小，不想逐項乘算。建立雙語本機工具，按比例計算每列食材，同時保留單位標籤；對「適量」不換算。介面要說明顯示精度，不能讓四捨五入的結果看起來精確到原食譜未提供的程度。

要求配置：gpt-6.1-sol / max。依 DISPATCH.json，create_thread 已接受要求的 model/thinking。backend identity 未確認；不得靠自述宣稱路由已確認。

## 關鍵規格

原份數、目標份數是 1..1000 的正整數。列數 1..50。食材名稱最多 80 UTF-16 code units；單位標籤最多 24。數量為 ASCII decimal，0..1000000，最多三位小數；零合法。明確的適量開關下列不要求數量，原量/新量都顯示「適量」。

每個可縮放數量先轉為整數千分位 BigInt，乘 target servings、除 original servings，採精確 half-up 到千分位。末尾零省略，正數四捨五入為零時顯示「小於 0.001」，並註明精度近似。固定例子與錯誤碼詳 TECHNICAL.md。

## 路徑與驗收

只按 TASKS.md M1 權限修改。以 ACCEPTANCE.md 逐例驗證；回報真實命令/exit、瀏覽器完成項、未做項、風險及檔案清單。不得把樣本結果、規格文件或自述當成實測。M1 完成後凍結交主代理，不能自行發布或部署。

2026-10-13 實作交接：49/49 測試（含 A1–A38）、check/build PASS；必要雙語真瀏覽器桌面/原生 320px/keyboard PASS。人工能力未暴露項目按 HANDOFF 列 NOT_RUN。source/code/runtime/dist hashes 與固定 bytes 均在 .runs/recipe-scaler/m1-2026-10-13-01a133a5/；preview 127.0.0.1:4200 持續運行。此為 M1 本機驗證結果，尚未獲主代理獨立驗收或 M2 放行。
