# CSS 2D Transform / Transform-Origin Explorer — BRIEF r2
文件提案，非產品實作、驗收或部署。

## 問題與目標
讓學習 CSS 或校對介面的人，以同一 200×100 CSS px 矩形比較 translate、rotate、scale 的順序與 transform-origin，清楚看到原矩形、變換後四個具名頂點、原點與可重現 CSS。解決「同樣數字但順序不同，為何移動位置不同」；不做一般 CSS IDE 或圖片編輯。

## 最小可交付構想
兩個同步比較面板 A/B 共用七個數值（tx、ty、angle、sx、sy、originX%、originY%），只各自選不同函式順序。單面板也可使用。顯示完整六種排列選單、具名頂點表、有效矩陣、退化警示，以及每面板確定格式 CSS；複製僅使用者按鈕。內含固定有差異範例、重設與中英雙語說明。所有資料只在記憶體處理。

## 嚴格非目標
不支援 3D、perspective、skew、動畫、transition、任意 CSS/HTML/JS 文字匯入、圖片/檔案/URL 匯入、上傳、帳號、雲端儲存、貼上解析、matrix 反解、drag 操作、viewport 單位、百分比 translate、巢狀 transform。不改使用者任何外部網站。這輪不寫產品程式或部署。

## 交付與開工門
本組只含 BRIEF、SPEC、AUTHOR-CHECK、INDEPENDENT-REVIEW 四份文件；獨立算例及推導完整內嵌 SPEC。正式開工前仍須最新登記去重、合法 actor 確認與唯一承接，不因文件保存取得其他人的 owner 或產品製作權。未登記草案的重複狀態尚待確認；文件完整度與 ready 登記分開。
所有產品實作、原生GUI、可及性及相容性驗證 NOT_RUN，分數 null。無合併或部署。
