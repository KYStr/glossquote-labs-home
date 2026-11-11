# FH-PRODUCT-WALL-PING-INDEPENDENT｜#325 修訂複驗

固定候選 `6282481d8e1fccab72c0d38f1fc741d156d2944b`，parent `8fbd9ac4d98865480444ce11c4b772389a54ea3c`。**PWP-01、PWP-02 的受影響離線檢查通過**。PWP-03 沿用原缺陷證據。兩款 `requiredChecksComplete=false`。 [PR #325](https://github.com/KYStr/glossquote-labs-home/pull/325) · [舊 head 複審 #328](https://github.com/KYStr/glossquote-labs-home/pull/328)

審查者 `local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7`。Registry r1655 讀回維護任務 `labs-five-hour-product-wallpaper-ping-20261111` 為 `working`，submission 為 null，原 owner 與 claim 相符。 [登記讀回](registry-readback.json)

## 受影響複驗

| 項目 | 壁紙 | 坪數 |
| --- | --- | --- |
| PWP-01 受控 Worker | 4/4 | 4/4 |
| PWP-02 首錯與 shape | 11/11，含原反例 | — |
| 壁紙輸入驗證回歸 | 36/36，沿用已固定獨立預期 | — |
| 新嵌入 Worker 回傳 | 2/2，涵蓋 SCHEMA 及有效清單計算 | 來源 bytes 相同，沿用兩筆舊證據 |
| Node 套件測試 | 62/62 | 63/63 |
| check、preview build 兩次、check-generated | 全部 exit 0 | 全部 exit 0 |
| 雙次建置及固定預覽比對 | 9 個預覽資產與 manifest 相符 | 9 個預覽資產與 manifest 相符 |

PWP-01 分別驗修改後替換、取消後重跑、重設後重跑，以及當前 Worker 收到錯誤世代或 null payload。舊回傳抵達時，新工作保持 busy、下載關閉，且新 Worker 保持運作。正確回傳才結束工作並開啟下載。 [壁紙 controller](https://github.com/KYStr/glossquote-labs-home/blob/6282481d8e1fccab72c0d38f1fc741d156d2944b/tools/wallpaper-calculator/public/js/controller.mjs#L98-L117) · [坪數 controller](https://github.com/KYStr/glossquote-labs-home/blob/6282481d8e1fccab72c0d38f1fc741d156d2944b/tools/ping-area-converter/public/js/controller.mjs#L79-L98)

PWP-02 原反例由 `ENUM / openingsMode / null` 改為 `SCHEMA / null / null`。額外核對缺欄與混用 shape 先報 SCHEMA、完整 shape 才報 ENUM、兩個枚舉同錯時牆模式在先、壞開口列保留列號，以及 shape 合法後仍正確拒絕逐牆搭配尺寸清單。 [壁紙核心](https://github.com/KYStr/glossquote-labs-home/blob/6282481d8e1fccab72c0d38f1fc741d156d2944b/tools/wallpaper-calculator/public/js/core/wallpaper.mjs#L145-L204)

## 沿用的證據

- 壁紙的公分轉換、MODE_COMBINATION 以後的計算與報告序列化區段位元組相同。36 筆輸入經新 schema 的結果與既定預期相符。兩語 HTML、CSS、app 綁定及列錯輸出也已核對，沿用原報告 bytes、數學及模擬定位證據。
- 坪數公開核心、預覽核心、嵌入 Worker 和 fixtures 位元組相同。沿用原獨立四單位／100 坪精度、100 列速查、報告及 Node Worker 證據。
- 兩款 `public/js/app.js` 與已建置 app 位元組相同。PWP-03 的 Worker 建構例外後未撤銷 Blob URL 仍列為開放缺陷，安全面向仍為 80。兩款預覽 server 位元組相同，沿用舊 loopback 安全標頭及路徑證據。 [依賴雜湊與各命令](retest.json)

固定候選的 66 檔逐一核對 Git blob。50 檔以相同 blob 與 SHA-256 沿用舊公開資料，16 檔重新匿名讀取。實際 head diff 的 16 檔與 PR diff 的 66 檔均完整重建。 [固定來源](source-check.json) · [diff 重建](diff-audit.json)

真實瀏覽器、原生下載、真機、輔具及 Network／Storage 為 `NOT_RUN_USER_FOCUS_INCIDENT`。正式 HTTPS／SEO、Registry 寫入、合併與部署均為 `NOT_RUN`。
