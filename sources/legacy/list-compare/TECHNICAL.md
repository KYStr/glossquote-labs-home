# 技術規格：名單比對與合併

狀態：SPEC_ONLY。本文是核心語義與驗收 oracle。

## 固定限制

每個輸入字串原始長度不得超過 100000 UTF-16 code units。只將 CRLF 和單獨 CR 正規為 LF，之後依 LF 分行。每側最多 5000 個非空項目（去重前）。項目最多 200 Unicode code points，在可選 trim 套用後計算。空白行定義為 String.prototype.trim 後為空；這些列忽略並計數，即使 trim 選項關閉也如此。trim 關閉時，非空項目的顯示/比較文字保留前後空白。拒絕項目內殘留 C0 或 C1 控制字元；CR/LF 已作為列分隔符處理。不得正規化 NFC/NFKC、全形、標點或空白。

輸入行號為 newline normalization 後的 1-based 實體行號，包含空白列。例如第一列空白、第二列 Ada，Ada 的 firstLine 為 2。尾端 LF 形成最後一個空行並計入 blankLineCount。空字串依 split semantics 視為一個空實體列，因此 rawLineCount=1、blankLineCount=1；非空字串若只含空白，依 LF 分行後的列都計為空白。空白列不算 item。

## 純函式 API 與 schema

核心提供 compareLists(request)，request 必須是 plain object（prototype 恰為 Object.prototype 或 null），且 Reflect.ownKeys(request) 恰為 aText、bText、trimItems、ignoreCase 四個字串 key。這拒絕 symbol key 與 non-enumerable unknown key；每個必要欄位還必須是 own enumerable data property，不接受 getter/setter。前兩者必須為 string，後兩者為 boolean；拒絕額外 key、缺欄位、陣列與非 plain object。回傳成功物件為 {ok:true,value}，失敗為 {ok:false,error:{code,side,line}}；不 throw 使用者資料錯誤。

錯誤碼固定為 INVALID_REQUEST、INPUT_TOO_LONG、TOO_MANY_ITEMS、ITEM_TOO_LONG、CONTROL_CHARACTER。side 是 A、B 或 null；line 是 1-based 原始列號或 null。驗證順序固定為 schema；A 原始長度；B 原始長度；A 逐列；B 逐列；所有結果計算。這表示即使 A 有行內容錯誤，只要 B 原始長度已超限，仍先回報 B 的 INPUT_TOO_LONG；A/B 都超原始上限時先回報 A。長度超限錯誤的 line=null；行內錯誤才提供 first offending line。錯誤不回傳任何輸入文字。

每側解析結果 schema：{side, rawLineCount, blankLineCount, nonEmptyLineCount, uniqueCount, duplicateCount, items}. side 是字串 A 或 B；所有 Count 欄位都是非負整數 Number。items 是按首次出現順序排列的 {key,text,firstLine,occurrences}，key/text 是字串，firstLine 是 1-based 正整數 Number，occurrences 是正整數 Number。duplicateCount 為非空輸入列數減 uniqueCount，occurrences 包含首次出現本身。穩定鍵為 text；ignoreCase=true 時 key=text.toLowerCase()，否則 key=text。無 locale、NFKC 或 trimming 以外的轉換。

完整成功值 schema：{a,b,summary,results}，ok 必須是 boolean true。summary 的 aOnlyCount、bOnlyCount、intersectionCount、mergedCount 都是非負整數 Number。results 是 {aOnly,bOnly,intersection,merged}；前兩者與 merged 元素 schema 為 {text,source,firstLine,occurrences,key}，文字欄位為 string、source 僅 A/B、行號及 occurrences 為正整數 Number；intersection 為 {text,aFirstLine,bFirstLine,aOccurrences,bOccurrences,key}，text/key 為 string、行號及 occurrences 為正整數 Number。失敗值的 ok 必須是 boolean false，error.code 是固定錯誤碼字串、side 是 A/B/null、line 是正整數 Number/null。所有返回欄位照上述列出的鍵完整建立，不回傳輸入原始物件。

## 集合與順序演算法

先各自解析並穩定去重。建立 B 的 key set。aOnly 是 A.items 中 key 不在 B 的項目，保持 A 順序。bOnly 是 B.items 中 key 不在 A 的項目，保持 B 順序。intersection 是 A.items 中 key 在 B 的項目，保持 A 順序；text 和 A 欄位由 A 首次項目提供，B 欄位由對應 B 首次項目提供。merged 是 A.items 全部在前，再追加 B.items 中 key 不在 A 的項目，兩段內各保留原順序。大小寫忽略只改比對 key，不改輸出文字。所有結果恰由這些規則決定，無排序、亂數或 locale 依賴。

### 固定例子

A 輸入為「Ada、Bo、空白行、Ada」，B 輸入為「bo、Cy、Ada」，trim=true、ignoreCase=false：A unique 為 Ada、Bo；A duplicateCount=1；A firstLine(Bo)=2；A blankLineCount=1；A-only=Bo；B-only=bo、Cy；intersection=Ada（A firstLine=1、B firstLine=3）；merged=Ada、Bo、bo、Cy。ignoreCase=true 時，A-only 為空，B-only 為 Cy；intersection 有兩項：Ada（A 行1/B 行3）和 Bo（A 行2/B 行1）；merged 為 Ada、Bo、Cy。

空 A 與空 B 的四種結果都是合法空陣列，成功計數為零；不是輸入錯誤。空 A、B 含「Z」時 B-only/merged 各為 Z，A-only/intersection 為空。

## 前端狀態與剪貼簿

任何輸入 input/change 事件以及任何選項變更都必須同步遞增 revision、清空完整結果並停用所有複製。只有成功按主按鈕才顯示新的結果；驗證失敗不保留前次結果。每個結果區的 copy 文字是該結果陣列所有元素的 text 按原順序用 LF join，不附加尾端 LF，不依目前視窗、捲動位置、分頁、虛擬列或可見部分截斷。空結果的 copy disabled，顯示「沒有項目可複製」。每次 copy 帶入目前 revision；剪貼簿 Promise resolve/reject 時，只有 request revision 等於目前 revision 且仍是最新的 copy request 才可改狀態或顯示成功。過期 resolve/reject 都忽略。navigator.clipboard 缺失、拒絕或寫入失敗時，顯示同區域唯讀可選文字並說明手動選取。不要記錄文字。

API 缺失/拒絕不阻止比較。清除與 pagehide 清除文字、選項、結果、可選文字、提示和非同步 request identity。重新載入只呈現初始狀態，不讀 browser storage。DOM 顯示使用 textContent 或建立 text node；不解析 HTML。
