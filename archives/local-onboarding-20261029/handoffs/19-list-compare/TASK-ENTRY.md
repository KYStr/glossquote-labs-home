# 任務單：名單比對與合併 M1/T00

任務 ID：LIST-COMPARE-M1-T00。狀態：M1 本機實作已凍結，實作者 gate PASS（另列人工 NOT_RUN），主代理獨立驗收 PENDING。

## 目標

建立雙語、無伺服器邏輯的靜態頁面。使用者貼上 A 與 B 名單並按「比對名單」後，得到 A only、B only、共同項目、合併清單和必要統計。MVP 的核心結果完全由 TECHNICAL.md 定義的純函式產生。

要求配置：gpt-6.1-sol / max。DISPATCH.json 記錄 create_thread 接受此指定值；threadId=01a133a5-8a46-7051-8802-1c189f457b30、hostId=local。實際 backend identity 未確認。

## 背景與精確期望

本工具解決把兩組人名、產品代碼或訂閱名單手動比對的工作。它不是逐行 diff，亦不替人判斷同義詞。比較以每側首次出現的項目為準。預設大小寫敏感，可選忽略大小寫。輸出順序穩定；來源列與重複數不可混淆。

每側最多 100000 UTF-16 code units、5000 個非空項目；每項最多 200 Unicode code points。CRLF/CR 轉 LF。空白行忽略並計數；trim 預設開啟且可關閉。每個非空項目的顯示文字為 trim 後或原列文字；第一個顯示文字勝出。

## 修改範圍

唯一實作路徑、必要命令、測試與停止條件在 TASKS.md。不得修改根目錄或兄弟專案。實作者可以在 M1 建立清單列出的本產品 public、scripts、test、package、設定文件，以及本工具專用證據目錄。

## 驗收回報

回報實際改檔、每條命令與 exit code、Node/npm 版本、瀏覽器實測路徑、真實瀏覽器可見版本（看不到就寫未暴露）、所有人工 NOT_RUN、已知風險及是否凍結。不得把未執行的 Network/Storage 或原生剪貼簿情境寫成通過。M1 結束先交主代理審查，不自行發布。

## 2026-10-13 M1 自驗

Node v24.14.0 / npm 11.9.0；`npm test`、`npm run check`、`npm run build` 均 exit 0。A1–A43 全數通過。真實 Edge 双語固定名單、規則變更/來源編輯失效、假範例、清除、空集合、320 CSS px、鍵盤與錯誤 focus 已實測；app 複製後以原生 Ctrl+V 貼回頁面欄位得到完整清單。

完整 Network/Storage 面板、真正 200% browser zoom、原生剪貼簿拒絕/缺失、OS IME、讀屏、真手機、其他瀏覽器引擎與貼到其他 OS app 保留 NOT_RUN。詳見 HANDOFF.md 及 ../../.runs/list-compare/m1-2026-10-13-01a133a5/。M2/M3 尚未執行。
