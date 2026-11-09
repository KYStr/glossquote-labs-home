# 驗收規格：名單比對與合併

狀態：SPEC_ONLY；下列案例皆 NOT_RUN。除明示為手動瀏覽器項目外，A 案例需用 node:test 的固定資料獨立驗證精確結果。

## A：核心/狀態必要案例

1. 兩側空字串 → 成功，四結果皆空且 summary 的四個結果計數皆 0；A/B 各 rawLineCount=1、blankLineCount=1、nonEmptyLineCount=0、uniqueCount=0、duplicateCount=0。此處的「四計數為0」只指結果 summary，不包含空白列統計。
2. A 空、B 為 Z → B-only 與 merged 為 Z；其他空。
3. A Ada/Bo，B Bo/Cy → A-only Ada、B-only Cy、交集 Bo、合併 Ada/Bo/Cy。
4. A 的順序 Z/A/M 不受排序影響 → A-only 與 merged 保持 Z/A/M。
5. B 的專有項目依 B 順序輸出，不按字母排序。
6. A 中 x/X，B 中 X，case-sensitive → A-only x、交集 X。
7. 同上 ignoreCase=true → A-only 空、交集與 merged 使用 A 首次 x。
8. ignoreCase 使用 simple toLowerCase，不做 NFKC：ASCII a 與 A 相等；全形Ａ與 A 不因此相等。
9. A 為「 Ada 」且 trim=true → 顯示鍵 Ada。
10. A 為「 Ada 」且 trim=false → 保留空格，與 B 的 Ada 不相等。
11. 空列、空格列、tab 列計 blankLineCount；行號依實體列維持。
12. CRLF/CR 混合 → 與等價 LF 輸入相同結果/行號。
13. 尾端 LF → 尾空行計 blank，不增加項目。
14. 同一側 A、A、B → occurrences(A)=2、duplicateCount=1、firstLine=1。
15. 重複列分散於空列後 → firstLine 仍是原實體列號。
16. B 重複不會讓 intersection/merged 重複輸出，B duplicateCount 正確。
17. 同鍵 A/B 文字不同大小寫 → intersection 顯示 A 的首次文字，B 首次行號與 occurrences 精確。
18. 5000 個非空唯一列 → 接受且 count=5000。
19. 第 5001 個非空列 → TOO_MANY_ITEMS，正確 side/line，沒有部分結果。
20. 原始輸入剛好 100000 UTF-16 code units → 通過長度 gate（其他條件合法）。
21. 100001 UTF-16 code units → INPUT_TOO_LONG；表情符號依 UTF-16 長度 gate 計算。
22. 200 code points 的一個項目 → 接受。
23. 201 code points → ITEM_TOO_LONG，正確列號。
24. trim 開啟會移除長項目的兩側空白後再計 200 code points；trim 關閉則超限。
25. 項目含 NUL/C0 或 C1 控制字元 → CONTROL_CHARACTER，不回傳原文。
26. request 缺欄、錯型別、array、額外 own key → INVALID_REQUEST。
27. A/B 原始長度都超限 → A INPUT_TOO_LONG；若 A 僅有行內容錯誤而 B 原始長度超限，依固定優先序回報 B INPUT_TOO_LONG；若 B 原始長度合法，再報 A 第一個行內容錯誤。
28. exact request schema 使用 Reflect.ownKeys：缺欄/錯型別/array/額外 own key/符號 key/non-enumerable key/accessor 欄位/非 Object.prototype 或 null prototype → INVALID_REQUEST。
29. 兩側合法且某個結果空 → 空集合成功，不顯示紅色錯誤。
30. 重複執行同一輸入 → 結果 byte-equivalent，證明沒有隨機重排。
31. 將 <img onerror=alert(1)> 作為值 → 以純文字顯示；不建立 img、不執行事件。
32. 每個 error code 有穩定 side/line/null 欄位，不含使用者原始文字。
33. A-only/B-only/intersection/merged 各自摘要 count 等於對應陣列長度。
34. 清除 → 兩輸入空、選項回預設、結果清空、全部 copy disabled。
35. 編輯任一輸入一字 → 當下結果清空，必須再次執行比較。
36. 切換 trim 或大小寫選項 → 當下結果清空。
37. 比對成功後改輸入再點舊 copy → disabled，舊內容不可複製。
38. copy 第一個 Promise pending，編輯後 Promise resolve → 不顯示舊成功。
39. 同 revision 兩次 copy 逆序 resolve → 只接受最新 request 的狀態回呼。
40. navigator.clipboard 缺失、拒絕與同步錯誤 → 提供唯讀可選文字，不下載、不丟 raw exception。
41. 每個非空結果區複製完整陣列所有項目，即使低於 viewport、在其他 responsive pane 或被虛擬化；文字以 LF join 且無尾端 LF。空集合 copy disabled 且不能寫入空字串。
42. pagehide 清除輸入、結果、可選文字、訊息與非同步 identity。
43. reload 開新 session → 空白初始頁；無 storage restore。

## B：人工瀏覽器必要流程（M1）

- 中文頁與英文頁分別輸入 A「Ada / Bo / Ada」、B「Bo / Cy」，手動比對；核對 A-only/Ada、B-only/Cy、共同/Bo、合併 Ada/Bo/Cy 及統計。
- 兩語各自切換忽略大小寫，以 alice/ALICE 驗證集合變化；改來源後確認舊結果立即消失與 copy disabled。
- 兩語載入假範例、清除、再試空輸入；空結果應是提示而非錯誤。
- 320px 窄視窗與 200% 縮放，輸入、錯誤、結果區、語言切換和複製入口都可達，不整頁橫向捲動。
- 全程鍵盤操作；第一個輸入錯誤後 focus 到錯誤欄位；使用讀屏可知錯誤、摘要和空結果狀態。
- 手動檢查 clipboard API 可用、拒絕/缺失時可選取唯讀文字。真實 OS 貼上是否成功須明確分開記錄。
- 網路與 Storage 面板檢查無非文件資產請求、無分析/beacon，無 local/session storage/cookies/IndexedDB；若無法觀測，列 NOT_RUN。
- 重新載入與返回頁面後資料消失；IME 貼上中文、長列上限及錯誤 focus 需實際操作記錄。

只做靜態碼審查不可冒稱完成以上人工項目。讀屏、各作業系統原生剪貼簿、所有瀏覽器引擎與真手機未實測時留 NOT_RUN。

## 通過門檻

所有 A 案例與 npm test、npm run check、npm run build 退出碼 0；雙語 B 主要比較流程與 320px 必要互動通過；scope diff 僅允許路徑。瀏覽器能力缺口可作人工 NOT_RUN 明列，但不掩蓋必要失敗。主代理需獨立驗收固定版本，M1 才可放行。
