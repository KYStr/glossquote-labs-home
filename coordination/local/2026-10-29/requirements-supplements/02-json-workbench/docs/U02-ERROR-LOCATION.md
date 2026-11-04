# U02：前往目前 JSON 錯誤位置

任務 U02-ERROR-LOCATION-20261013；2026-10-13。這是已發布工具的候選可用性升級，沒有繼承舊版本的外部驗收；正式部署、主代理獨立驗收及新版外部確認尚待執行。

使用者遇到長 JSON 時，看到行／欄仍要自己找字。錯誤旁的「前往錯誤位置 / Go to error」將原生 textarea 的焦點與插入點移到當前錯誤，讓使用者立即修改。只在按下時移動；Worker 完成不會自行搶焦點。

安全與資料契約：

- 目前 session 必須是 error、錯誤代碼是有語法位置的 INVALID_JSON／INVALID_UNICODE／DUPLICATE_KEY、offset 是整數且介於 0 與來源 UTF-16 length（含EOF），textarea.value 必須與產生錯誤的來源逐字相等。逾時／能力／大小限制等非位置錯誤，即使不一致的reply帶數值offset也不露出定位。
- 來源／模式／清除／取消／重跑失效舊定位；所有遲到回覆仍由既有 jobId 與 running 狀態拒絕。按鈕的 render 與 click 均即時核對，不另外保存舊 offset。
- 呼叫 focus 與 setSelectionRange(offset,offset)；不寫 source.value、不自動修复、不自動重新檢查、不改輸出。
- textarea 保持 wrap=off；以實際行高捲到錯誤行，寬行用當前系統字型的本機 canvas measureText 估計 caret 水平位置。Canvas 不繪圖、不加入DOM、不儲存內容。字型差異下捲動屬盡力呈現；UTF-16 selectionStart/End仍使用原始精確offset。
- 沿用44px控制、雙層focus、角色與錯誤描述關聯、兩語靜態說明與原有SEO／同語首頁。無新依賴、storage、網路／上傳、剪貼簿讀取或遠端字型。

## 重現與預期

| 輸入／步驟 | 預期 |
|---|---|
| `{"a":}` → 檢查 → 定位 | 插入點5，selectionStart=selectionEnd=5；來源不變 |
| `{"a":1` → 檢查 → 定位 | EOF插入點6 |
| `{"😀":}` → 檢查 → 定位 | UTF-16插入點6，不把emoji算成一個code unit |
| `{"a":1,"a":2}` → 檢查 → 定位 | 第二鍵的開頭offset7，duplicate規則不變 |
| CRLF貼入 | 以textarea實際LF正規化值的parser offset定位，不用貼入前字串猜座標 |
| 在offset5輸入1 | 來源成為 `{"a":1}`，先dirty並隱藏定位；明確重檢後success |
| 1,500行來源的最後缺值 | 錯誤行1503、offset15400，caret與該行在textarea可見區 |
| 20,000字元字串後缺值 | offset20017，水平捲至錯誤位置；320px兩語亦可定位 |
| 編輯／mode／clear／重跑／cancel／late callback | 舊按鈕即時失效；舊回覆不能恢復目標 |
| 空輸入／null／未知code／無效offset | 沒有可操作定位按鈕 |
| 按檢查後聚焦其他控制，等待錯誤 | 焦點留在該控制；只在定位按鈕點擊／鍵盤啟用時移到來源 |

## 本機證據

- `node --test test/error-location.test.mjs`：3/3 PASS，含真parser offset與精確source绑定、失效／遲到回覆。
- 真 Chrome 154.0.8037.98／Windows／獨立headless context：兩語22案例PASS；直接讀取selectionStart/End、document.activeElement、textarea scroll與可見行。另兩語320px目前寬行定位／雙層focus補驗PASS。
- 兩語完整修正→明確重檢成功；大數、-0、1.2300、1e400的輸出／實際下載／首次載入後離線PASS。載入後運算HTTP=0、console=0，測試context cookies/local/session storage/IDB皆空。
- 原生selection API的長行探測原本scrollTop=0、lineVisible=false；補可見區捲動後scrollTop=35754、lineVisible=true，沒有把該失敗當人工例外略過。
- 完整 npm test/check/build/build:release 與公開固定來源結果見 VALIDATION 與本機HANDOFF的本任務追加記錄。

人工 NOT_RUN：Firefox、實體手機／觸控、原生200%browser zoom、screen reader／獨立AA、真OS clipboard成功寫入、新版正式部署／主代理独立驗收／外部複驗。Chrome320px、CSS200%與reduced-motion已測，不能冒充實體手機或原生zoom。

API參照：[MDN setSelectionRange](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement/setSelectionRange)、[MDN focus](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus)。來源處理仍遵守原本受限JSON的大小、深度、原始token與匯出契約。
