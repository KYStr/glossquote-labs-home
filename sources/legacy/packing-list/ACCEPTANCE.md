# 驗收規格：行李清單與重量試算

狀態：SPEC_ONLY；所有案例 NOT_RUN。輸入皆為人造資料。Automated cases 驗純函式/狀態，不代表原生 File API 或真瀏覽器通過。

## 自動可驗收案例

| ID | 輸入/操作 | 預期 |
|---|---|---|
| A01 | createEmptyDraft() | rows=[]、limitGramsRaw=""，沒有全部打包百分比 |
| A02 | createRowDraft("row-1") | 空名稱、quantityRaw="1"、unitWeightGramsRaw=""、packed=false |
| A03 | qty 99、weight 99999 | 兩值接受；型別皆整數 |
| A04 | qty 1、weight 0 | 接受已知 0 g；summary unknown rows=0 |
| A05 | 空白 weight | 保持 null；不得與 A04 混同 |
| A06 | qty 0、-1、1.5 | OUT_OF_RANGE / INTEGER_REQUIRED，列不靜默略過 |
| A07 | weight 100000 | OUT_OF_RANGE |
| A08 | limit 空白 | limitGrams=null |
| A09 | limit 0 | OUT_OF_RANGE |
| A10 | limit 999999999 | 接受 |
| A11 | limit 1000000000 | OUT_OF_RANGE |
| A12 | ASCII 空白包住 12 | trim 後接受 12 |
| A13 | 全形 １、+1、1e2、1,000 | 拒絕；不作寬鬆解析 |
| A14 | 33 code units 數值字串 | INPUT_TOO_LONG |
| A15 | 名稱 80 code units | 接受；81 拒絕 |
| A16 | 名稱含 <img src=x onerror=1> | 當純字串顯示，不生成元素/事件 |
| A17 | 名稱含 U+000A | CONTROL_CHARACTER |
| A18 | 空白名稱 | 顯示列序 fallback；匯出仍為空字串 |
| A19 | 100 列新增 | 接受；101 列 ROW_LIMIT |
| A20 | row IDs 重複 | DUPLICATE_ID，整個 list 驗證失敗 |
| A21 | qty2×350 g、qty1×200 g，limit 900 | 總件數 3、總重 900 g、within |
| A22 | A21 第一列 packed=true，第二列 false | row progress 1/2；packed pieces 2/3 |
| A23 | qty2×350 g、另一列 weight=null qty4 | known subtotal 700 g；unknown 1 row/4 pieces；total=null |
| A24 | 有 unknown row、known subtotal=700 g、limit=500 | limitStatus=over-known-minimum；minimumOverByGrams=200；totalWeightGrams=null、overByGrams=null；只能說至少超過 200 g |
| A25 | 全部已知總重 501 g、limit=500 | limitStatus=over，差額 1 g |
| A26 | 全部已知總重恰 500 g、limit=500 | within，不能算 over |
| A27 | 清單空、limit=100 | 不顯示重量或 0/0 全部打包 |
| A28 | makeExampleList() | 衣物 2×300 + 充電器 1×200，總重 800 g，全部已知 |
| A29 | exact schema v1 匯入 A28 | 預覽 rows=2,pieces=3,total=800 g；尚未替換 |
| A30 | schemaVersion 2 且帶多一個 root key | UNKNOWN_FIELD（額外 key 優先於 version）；舊清單不動 |
| A31 | 缺 row 欄位 | INVALID_ROW，整份拒絕；不部分匯入 |
| A32 | File 131072 bytes | 可進 UTF-8/JSON 驗證；131073 bytes FILE_TOO_LARGE |
| A33 | 非 UTF-8 bytes 或 JSON { | INVALID_UTF8 / INVALID_JSON，不顯示原文 |
| A34 | 匯入解析後改任一欄再按確認 | 預覽失效，不得覆蓋最新清單 |
| A35 | 匯入預覽取消 | 原 list 完全相同 |
| A36 | 匯出 fixture 後重匯 | schema 相同；0/null 差異保留；沒有 timestamp/IP |
| A37 | 名稱含 </textarea><script> | 僅作文字內容，不執行 |
| A38 | 清空確認取消 | 資料保留；pagehide 不寫 storage |
| A39 | unknown rows >0、known subtotal=500、limit=500 | unknown-weight；不可宣稱 within 或 over |
| A40 | validateDraft 直接收到 root/row 額外 symbol 或 non-enumerable key、required getter、或 sparse rows | 額外 own key UNKNOWN_FIELD；required getter INVALID_SCHEMA 且 getter call count=0；sparse rows ROW_LIMIT；全部 summary=null |

## 真實瀏覽器必要檢查（M1）

- B01 中文主流程：在 4202 中文頁新增兩項，填數量/重量，勾選一項；核對列數進度、件數及總重與 A21/A22。
- B02 英文主流程：/en/index.html 完成相同兩列，欄位標籤、狀態、空值未知重量均為英文，沒有漏翻。
- B03 未知重量阻止總判定：留一列重量空白並設定上限；若已知小計小於等於上限，只稱 known subtotal 並顯示無法判定；若已知小計已大於上限，顯示至少超出下限，不顯示精確總重或差額。
- B04 篩選：切到未打包後藏起打包列，summary 仍依全清單計算。
- B05 範例替換取消/確認：有資料時取消載入保持不變；再次確認顯示兩列 800 g 範例。
- B06 JSON 匯出/匯入：使用真實瀏覽器下載，再選該檔；預覽前舊清單不變，取消不變，重新匯入確認後完整替換。原生下載與 file picker 是人工必驗；若設備無法操作，逐項記 NOT_RUN，不以 mock PASS。
- B07 鍵盤：僅用鍵盤新增、編輯、勾選、刪除與取消 dialog，焦點可見且不遺失。
- B08 320px viewport 必須實測：不出現整頁水平溢出；標籤/錯誤/摘要/動作仍可達。
- B09 200% zoom 若現有工具無法調整，單獨標 NOT_RUN，不與 B08 合併標 PASS。
- B10 私隱：DevTools Network/Storage 檢查使用者資料不送出且沒有 storage 寫入；若無完整 network/storage 能力標 NOT_RUN，不以 source scan 當作通過。
- B11 刷新提示：可見資料消失警告；MVP 不宣稱 reload recover。

M1 必驗：B01–B08、B11；B08 的 320px 寬度必須實測。B09 的 200% 縮放與 B10 Network/Storage 若工具不支援可各自 NOT_RUN，不得合併成 PASS。


