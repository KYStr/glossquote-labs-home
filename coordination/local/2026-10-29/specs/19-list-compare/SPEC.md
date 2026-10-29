# 名單比對與合併 — 既有規格保存

Task ID: `labs-19-list-compare` · Spec ID: `spec-19-list-compare`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：名單比對與合併

狀態：SPEC_ONLY。MVP 尚未實作。

## 使用者工作

使用者手上有兩份相似但不完全相同的名單，想知道哪些只在一份、哪些共同存在，再取得一份可以貼去其他地方的合併清單。常見來源是複製貼上的文字或試算表單欄；本工具只接收文字，不解析欄位、檔案或商家資料。

成功狀態：使用者能清楚讀出 A-only、B-only、共同項目和合併清單；了解空結果是合法比較結果；能複製任一完整區塊；修改任一來源或規則後，舊結果不再看起來有效。

## MVP 必須有

- A、B 兩個具名多行輸入區及一個明確主按鈕「比對名單」。
- 初始只有本機操作說明與空輸入。可載入明確標註為假資料的範例，範例只使用虛構名字。
- trim 預設開啟、大小寫敏感預設開啟；選項的作用在操作前可見。
- 顯示每側輸入行數、忽略空白列數、去重後項數和重複列數。
- 四區結果：只在 A、只在 B、共同項目、合併清單。共同項目顯示 A 的首次文字；同一側重複不重複列出。空集合要顯示「沒有符合項目」，而不是錯誤。
- 每個結果區顯示項目數和自己的複製按鈕；結果尚未產生或已過期時複製 disabled。
- 每個唯一項目可顯示來源首次列號；說明行號是換行後的 1 起算位置，空白列仍佔行號。
- 清除按鈕清空雙側文字、回到預設選項、清除結果；離頁或重新載入不保存草稿。

## 不做

逐行 diff、排序、全域替換、regex、模糊比對、拼字正規化、大小寫語言推測、NFKC、檔案/試算表上傳、同步/分享、持久化、帳號、伺服器分析、篩選編輯器、手動挑選合併項目、命令列介面。

## 使用文案原則

說明「同一項目」由可選規則決定。比較不代表兩筆資料在現實中等價。忽略大小寫會讓例如 Alice 與 alice 視為相同鍵，但輸出保留 A 或該側首次文字。不得宣稱找出「相同的人」或「重複帳戶」。


---

## 原文件 TECHNICAL.md

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


---

## 原文件 UX-SEO.md

# 介面、雙語文案與 SEO：名單比對與合併

狀態：SPEC_ONLY。實際 metadata/HTTP/搜尋收錄均 NOT_RUN。

## 產品介面

採 Product App / Operate 模式。任務畫布以兩份名單和可讀結果為主，暖紙底色與墨色文字遵循 docs/DESIGN-SYSTEM.md。不要做 SaaS hero、假統計、遠端字型或裝飾卡片牆。

桌面順序：產品標題與語言連結；一句用途/本機隱私說明；A、B 輸入區並列；trim 與大小寫選項；比對/載入範例/清除；摘要；四個結果區。手機使用單欄，先 A 再 B，再選項/動作，摘要和結果依 A-only、B-only、共同、合併排列。每個結果區有標題、項目數、只屬於該區的複製鈕與完整可選文字。320px 無整頁橫向捲動。

每個文字區有可見標籤、上限提示和目前字元/行數狀態。錯誤文字同時指出 A/B 和列號，不回顯過長個資。提交後 focus 第一個有錯誤的欄位；成功時用一次 polite 狀態播報摘要，不逐列播報。鍵盤順序與視覺順序一致。

### 繁體中文搜尋文案

Title：名單比對與合併：找出新增、移除與共同項目 | GlossQuote
Description：貼上兩份一行一筆的名單，在瀏覽器本機找出 A 獨有、B 獨有、共同項目與去重合併結果。可選前後空白與大小寫規則，不需上傳或建立帳號。
H1：名單比對與合併
Intro：貼上兩份清單，快速知道哪些新增、哪些移除、哪些兩邊都有。

### English search copy

Title: Compare and Merge Lists: Find Added and Shared Items | GlossQuote
Description: Paste two line-separated lists to find items unique to each side, shared items, and a stable merged list locally in your browser. Choose trimming and case rules; no upload or account is needed.
H1: Compare and merge lists
Intro: Paste two lists to see what is new, what is missing, what they share, and a de-duplicated merge.

## 可見 FAQ

繁中至少呈現以下四題與完整答案；英文頁提供同義、完整翻譯的四題：
1. 是否逐行比較？不是；按每列項目是否在另一份名單中比較，順序不要求相同。
2. 什麼情況算相同？預設先去掉每列前後空白，再以大小寫敏感方式比對；關閉 trim 會保留外側空白。開啟忽略大小寫後使用小寫鍵，不做拼字或 Unicode 正規化。
3. 同一側重複會怎樣？結果只保留首次項目，統計重複列，顯示首次行號。
4. 名單會上傳或保存嗎？設計為只在此頁記憶體計算；離頁/重載即清除，不會保存草稿。
5. 空結果代表失敗嗎？不是；兩側都合法而某類結果為零時，會顯示「沒有符合項目」。

## 發布 SEO 契約

預覽每個 HTML 使用 noindex,nofollow，preview robots.txt 禁止索引。只在 M2 production build 才固定 canonical：
繁中 https://lists.glossquote.com/index.html；英文 https://lists.glossquote.com/en/index.html。兩頁互設 zh-Hant/en hreflang 並以中文頁作 x-default；html lang 正確，title/description/OG URL 相符。每頁可有準確的 WebApplication JSON-LD，名稱、語言、固定網址、UtilitiesApplication 和 Web 作業系統必須與可見頁面一致，不加入評分、價格、評價或虛構使用數。FAQ 結構化資料不得承諾搜尋結果會顯示 rich result。robots、sitemap、headers、404 由 docs/RELEASE.md 限定。


---

## 原文件 ACCEPTANCE.md

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


---

## 原文件 TASKS.md

# 任務與里程碑：名單比對與合併

目前只允許 M1/T00。M2、M3 僅作後續契約，不代表現在放行。

## M1/T00：本機雙語 MVP

目標：完成 TECHNICAL.md 的核心、雙語靜態 UI、精確 A 案例、check/build 和 ACCEPTANCE.md 的必要 B 流程，固定供主代理審查。

允許修改：本資料夾內 public/index.html、public/en/index.html、public/robots.txt、public/styles/**、public/js/**、scripts/**、test/**、package.json、.gitignore、僅有需要才增加的 M1 設定檔；進度/交接可更新本資料夾 README.md、START-HERE.md、TASK-ENTRY.md、HANDOFF.md、project.json 與 docs/RELEASE-CANDIDATE.md；證據只在本工具專用根 .runs/list-compare/m1-<date>-<id>/**。不得在 repo 根執行 git 操作。

必要命令：Node.js 24.x；npm test、npm run check、npm run build；npm run dev 優先綁定 127.0.0.1:4199。若該埠已被佔用，不得停止或重用未知程序；用 `server.listen({host:'127.0.0.1',port:0})` 讓作業系統指派可用 ephemeral port，並在 HANDOFF 與證據中記錄實際埠及 URL。Spike 優先用 5199，佔用時同樣使用該 listen 方式取得 OS 指派的 loopback ephemeral port。長測前後執行根 AGENTS 的 Windows environment guard，記錄 fingerprint，不改持久環境。

非目標：發布、正式 sitemap/canonical、Cloudflare、首頁更新、根索引、外部驗收。

停止條件：測試或需求有矛盾、越權路徑、需新增依賴/網路/檔案儲存、欲改輸入語義、OS 指派的 loopback port 仍無法啟動、environment drift、不能安全清理輸入、任何秘密意外出現。不得為解決埠衝突終止既有程序。保存證據後停止回報，不自行修根目錄。

## M1 主驗與凍結

實作者提交實際 diff、命令、B 觀察和 NOT_RUN 後釋放 owner。主代理審查 code/tests/spec mapping 並在可用瀏覽器親跑精確例子。只有主代理確認固定 source scope、安全與必要 gate 後才可進 M2；不得由實作者自我授權。

## M2：公開來源與 production candidate（尚未放行）

只有主代理明確放行才開始。目標是固定 production build 與 reviewed source 的獨立公開 GitHub repo，不是部署網站。

Allowed paths：M1 已凍結核心演算法與功能行為，不得修改 public/js/core/** 或其語義測試。M2 可新增/修正必要的 package.json、scripts/** production release helpers、project.json、HANDOFF.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、wrangler.jsonc；允許為正式發佈修改 public/index.html 與 public/en/index.html 的 SEO head、同語首頁連結，新增/修正 public/404.html、public/_headers、public/robots.txt、public/sitemap.xml 或其生成器；不得藉此改核心工具行為、輸入語義或 UI 流程。產物只在本工具 dist-production/**；證據及 reviewed source archive 只在孵化器根 .runs/github-publish/glossquote-labs-list-compare/**。可發布檔案只從此工具 allowlist source copy 產生；不得改根 git、首頁或別的工具。

Commands：npm test、npm run check、npm run build、npm run build:production、npm run check:production、node scripts/manifest.mjs；從 archive 解壓的乾淨副本再跑 npm test、npm run check:production、npm run build:production。固定 commit ZIP 可用 git -C <reviewed-repo-copy> -c core.autocrlf=false archive --format=zip --output <archive.zip> <commit>，或等效方式；不得改 global/system git 設定。解壓後逐檔核對 source ZIP bytes/hash 與該 commit 的 Git blob，再從解壓副本重建 production tree。

Exact acceptance：preview 仍 noindex/nofollow、robots 禁止索引；production origin 固定為 https://lists.glossquote.com，不由 Host/query 控制 canonical；zh-Hant/en 頁面、互返 hreflang/x-default、JSON-LD、robots/sitemap 只指兩頁且一致。production 404 真 404、無 SPA fallback；正常 HTML/CSS/JS/XML/TXT MIME 與安全 headers 符合發布契約。所有必要命令 exit 0；公開 repository URL 為 https://github.com/KYStr/glossquote-labs-list-compare，實查 PUBLIC、remote HEAD 等於記錄 commit；ZIP 解壓 build/check 符合固定 tree。記錄每項實際 evidence。

Non-goals：Cloudflare 部署、DNS、homepage catalog 或正式 URL 上線。Stop：任一命令失敗、source ZIP/blob 不等、repo 非 PUBLIC/HEAD 不符、production host 不固定、scan 發現個資/secrets/.runs/dist/node_modules/兄弟檔、需要新增憑證或權限。保留失敗證據並交主代理，不可用 force push 或重寫 Git 全域設定。

## M3：免費主機、首頁與交付（尚未放行）

僅主代理負責；使用既有免費 Cloudflare 子網域授權，候選 host lists.glossquote.com。主代理先以同一 fixed commit/build 做正式候選，再經已批准部署 workflow 發布靜態 dist-production；不由功能 chat 讀取/擴張 credential。

Allowed paths：本工具 deploy/release config（若 M2 已準備且經審查）、project.json、HANDOFF.md、docs/RELEASE-CANDIDATE.md；部署平台固定 site 資產；共享首頁只由主代理序列修改 tool-projects/00-home/catalog.json 與該專案必要 build/release files。不可改其他工具或 040141.xyz。

Commands/checks：npm run check:production；使用 root approved Cloudflare release workflow 的實際部署命令並將 literal command/tool、exit/version記錄；live HTTPS GET/HEAD 對中英 /index.html 都須 200，未知路徑須真正404且沒有SPA fallback；核對 content type、CSP、安全 headers、固定 origin/canonical/hreflang/robots/sitemap 與候選產物 bytes。再以主代理真瀏覽器完成兩語主要比對、改值結果失效、copy 行為。只有工具已 live 驗證後才在首頁增加 published catalog，從首頁執行 `npm.cmd run build:production`、`npm.cmd run check:generated:production`、`npm.cmd run prepare:production`，發布 homepage source copy 並用相同 approved workflow 部署；雙語首頁都須顯示本工具正確的雙語入口並回鏈到正確語言。

Exact acceptance：日期、公開 commit、實際 deploy version、production files、正式 URL、首頁 source/deploy version 各自記錄；工具和首頁都在 HTTPS 真實回應驗證通過，首頁 draft→published 發生於工具 live gate 之後。交付使用者時狀態 awaiting external review，附雙語 URLs、public source ZIP、測試、限制和外驗模板。

Non-goals：付費服務、改 DNS/domain、讀/新增/擴張 credentials、改 040141.xyz、其他產品/首頁條目。Stop：部署工具要求新 permission/token、費用、正式 DNS變更、live bytes/headers/SEO不符或首頁source/deploy不一致；保留狀態與證據，通知主代理。外審確認前不得標 complete。

