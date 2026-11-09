# 食譜份量換算 — 既有規格保存

Task ID: `labs-20-recipe-scaler` · Spec ID: `spec-20-recipe-scaler`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：食譜份量換算

狀態：SPEC_ONLY。實際功能尚未建立。

## 使用者問題與成果

做飯的人找到一份 4 人食譜，但要煮 6 人份，常得逐個乘食材數量；份數縮小時又容易換算錯。工具應一次計算所有食材，呈現原量、新量和單位，並保留無法量化的「適量」。

成功結果：使用者確認原份數和目標份數，逐列輸入名稱、原數量、單位或勾選適量，明確按「計算份量」後看見可抄用的新清單。若數字不可解析或有空列，工具指出該列，不生成部分結果。

## 必須包含

- 原份數與目標份數；預設皆為 1，不自動計算。
- 1–50 列食材：名稱、原數量、單位標籤，以及「適量」選項。
- 載入示例可提供 4 份轉 6 份：米 300 g→450 g、水 1.2 L→1.8 L、鹽適量→適量。明確標為示例，不自動計算。
- 每列原數量與換算後數量一起顯示；單位標籤只沿用原文。
- 舍入提示和正值不到顯示精度時的「小於 0.001」標記。
- 完整食材表複製、清除、可見 validation；來源或設定一變，輸出立即失效。

## 不在 MVP

分數/混合數輸入、單位換算、杯/匙/克估值、密度推算、烹調溫度與時間、卡路里/營養、過敏/醫療建議、購物清單、雲端收藏、圖片/檔案辨識、帳戶。

計算是數學比例，不保證烹調結果、器具或食材物理特性隨份數線性改變。使用者自行判斷鍋具、烹調時間、調味和食品安全。


---

## 原文件 TECHNICAL.md

# 技術規格：食譜份量換算

狀態：SPEC_ONLY。這是實作與測試的數值 oracle。

## 輸入與範圍

servings 欄位為最多 4 ASCII digits 的字串，正規表示式為 ^[0-9]{1,4}$，允許前導零但解析值須 1..1000。原份數和目標份數各自驗證。表格需有 1..50 列，不可因空白列跳過後續列。

每列 exact schema 為 {name, amount, unit, toTaste}。name、amount、unit、toTaste 欄位全都存在；name/amount/unit 為字串，toTaste 為 boolean；拒絕額外欄位。先以原始 UTF-16 code units 檢查 name 最多 256、unit 最多 128，超過直接回 NAME_RAW_TOO_LONG/UNIT_RAW_TOO_LONG，避免對任意長空白執行 trim。再分別 trim；名稱必填且最多 80 UTF-16 code units，單位可為空且最多 24。trim 後名稱/單位拒絕 C0/C1 control characters。單位保留大小寫、符號及語言，不換算。

amount 不論 toTaste 值都必須是字串，原始長度最多 16 UTF-16 code units。若 toTaste=true，amount 必須恰為空字串；殘留任何字符回 TO_TASTE_AMOUNT_NOT_EMPTY，絕不可忽略隱藏的任意長值。若 toTaste=false，空值回 ROW_INCOMPLETE；非空值必須為 1..16 ASCII 字元，符合 ^[0-9]+(?:\.[0-9]{1,3})?$。允許前導零與尾端小數零；負號、正號、逗號、空白、科學記號、Unicode 數字與只有小數點均拒絕。解析值須 0..1000000，0 合法。原文字使用輸入 trim 後的形式呈現。toTaste=true 時輸出原量和新量為固定文字「適量」。UI 切換適量時同步清空量欄，且不得保留或提交隱藏草稿。

## 核心 API 與結果

scaleRecipe(request) 接受 plain object（prototype 恰為 Object.prototype 或 null）且 Reflect.ownKeys(request) 恰為 originalServings,targetServings,rows。每個 request 欄位必須是 own enumerable data property，不接受 getter/setter。rows 必須是 prototype 恰為 Array.prototype 的 dense Array；Reflect.ownKeys 除 length 外只有從 0 到 length-1 的連續 index，且每個 index 是 own enumerable data property；hole、subclass/custom prototype、symbol key、非列舉額外 key 或自訂額外屬性都回 INVALID_REQUEST。每個 row 必須是 plain object（prototype Object.prototype 或 null），Reflect.ownKeys 恰為 name,amount,unit,toTaste；每欄必須是 own enumerable data property，拒絕 symbol/non-enumerable/未知鍵與 accessors。回傳 {ok:true,value:{originalServings,targetServings,rows,summary}} 或 {ok:false,error:{code,row,field}}，ok 為 boolean。成功的份數、rowCount、scaledCount、toTasteCount 為整數 Number；rows 是 dense Array，順序與輸入完全一致，每列精確為 {name,originalText,scaledText,unit,toTaste,approximate}，四個文字欄位為 string，toTaste/approximate 為 boolean。失敗時 error.code 為固定錯誤碼字串，row 為 1-based 正整數 Number/null，field 為固定欄位字串/null。錯誤不 echo 使用者輸入。

固定錯誤碼：INVALID_REQUEST、INVALID_SERVINGS、TOO_FEW_ROWS、TOO_MANY_ROWS、ROW_INCOMPLETE、NAME_RAW_TOO_LONG、NAME_TOO_LONG、UNIT_RAW_TOO_LONG、UNIT_TOO_LONG、AMOUNT_TOO_LONG、TO_TASTE_AMOUNT_NOT_EMPTY、CONTROL_CHARACTER、INVALID_QUANTITY、QUANTITY_TOO_LARGE。field 為 servings-original、servings-target、name、amount、unit、rows 或 null；row 為 1-based 列號或 null。驗證順序為 request schema（含 dense rows / row schema）、原份數、目標份數、列數、逐列欄位從上到下；每列先 raw name/unit/amount 長度，再 trim 後的 name/unit required/control/length，再驗 toTaste/amount 空值規則及數量 grammar/range。回傳首個錯誤，沒有部分結果。

## 精確縮放與顯示

將 ASCII 小數逐字元解析成 BigInt milliUnits（最大小數三位），整數形式乘 1000；帶小數時以 BigInt 右補到三位。servings 驗證後也轉 BigInt。令 m 為非負 BigInt milliUnits，O 為 BigInt original servings，T 為 BigInt target servings。精確分子 n=m*T，分母 O。整個乘法、除法、half-up 比較與格式前的結果都維持 BigInt；不得轉 Number 參與縮放或舍入。輸出 milliUnits r=floor((2*n+O)/(2*O))，即非負整數的 half-up 到最接近千分位。

格式化 r：整數顯示整數；否則顯示三位小數並移除尾端零。若 n>0 且 r=0，顯示固定文字「小於 0.001」/ “< 0.001”，approximate=true。其他情況，approximate 在 n 除以 O 有餘數時為 true，否則 false。UI 標示這些小數是近似值，最多精確到三位小數；不宣稱更多精度。

固定 oracle：4→6，300 g=450 g；1.2 L=1.8 L；適量保持適量。1→3，0.001=0.003。3→1，0.001 的真值低於 0.001，顯示小於 0.001。2→3，0.0015 不符合輸入格式，拒絕，而非用四捨五入接受。2→1，0.001 的精確結果是 0.0005，half-up 正好 tie，顯示 0.001 並標 approximate。3→1，0.001 不到此 tie，顯示小於 0.001。

## UI state / copy

只有按「計算份量」且整體 request 合法後才呈現完整結果。任一 input/change、行增刪、toTaste 切換或份數改變都遞增 revision、清除結果、清除舊文字報告並停用 copy。驗證錯誤後焦點移到第一個錯誤欄位。Copy 只在使用者按鈕事件觸發；promise callback 必須同時檢查 revision 與最新 copy request id。缺少/拒絕 clipboard 時顯示 readonly 可選文字，不下載。清除/pagehide/reload 不保存草稿、不保存輸出。


---

## 原文件 UX-SEO.md

# 介面、雙語文案與 SEO：食譜份量換算

狀態：SPEC_ONLY；SEO/HTTP 尚未建置或實測。

## 產品介面

Product App / Operate。主要工作表就是份數和食材列，結果貼近輸入；品牌標頭安靜，不使用抽象廚房插圖或假營養圖表。

桌面：名稱/說明/語言；原份數與目標份數；食材列（名稱、原數量、單位、適量切換、移除）；新增列/清除/載入示例/計算；結果清單原量→新量、舍入提示和複製。手機改單欄卡片式列，每列欄位不橫向擠壓；主按鈕和結果可見。320px 不發生頁面橫向捲動，必要時只讓食材表局部捲動。

標籤直接可見；錯誤綁定欄位，焦點移到首錯。數量提示「最多 3 位小數；不換算單位」。適量選項旁說明不縮放。結果用文字區分準確/近似和小於最小顯示量，不只依賴顏色。

## 中文搜尋文案

Title：食譜份量換算：按人數調整食材用量 | GlossQuote
Description：輸入食譜原份數與目標份數，在瀏覽器本機按比例換算各項食材。保留單位文字，支援適量項目，不做單位或烹調時間推測。
H1：食譜份量換算
Intro：把食譜調整到需要的人數，逐項計算新的食材用量。

## English search copy

Title: Recipe Scaler: Adjust Ingredient Quantities by Servings | GlossQuote
Description: Scale recipe ingredient amounts locally by changing the original and target servings. Keep unit labels and leave “to taste” ingredients unchanged; no unit or cooking-time conversion.
H1: Recipe scaler
Intro: Change the serving count and recalculate each ingredient amount for your recipe.

## FAQ 內容

兩種語言都至少顯示五題：可以換算單位嗎？不行，單位原樣保留；「適量」怎處理？原樣保留、不縮放；小數如何舍入？以精確比例計算並最多顯示三位小數、half-up；烹調時間或溫度會一起換算嗎？不會；資料會保存嗎？目前頁面記憶體中計算，離開即清除。

## SEO 發布界線

本機 preview 為 noindex,nofollow，robots 禁止索引。production 只在 M2 使用固定 https://recipe.glossquote.com/index.html 和 /en/index.html；self canonical、zh-Hant/en reciprocal hreflang、x-default 指繁中；語言、title、description、Open Graph URL 一致。準確的 WebApplication JSON-LD 可描述實際工具，不承諾評價、rich result、排名或營養結果。真實 robots/sitemap/404/headers 依 docs/RELEASE.md，未經 HTTP 測試不宣稱已符合。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：食譜份量換算

狀態：SPEC_ONLY；所有案例 NOT_RUN。A 案例需以 node:test 和固定 expected 檢驗，不得用實作結果當測試 expected。

## A：核心與狀態案例

1. 4→6，米 300 g → 450 g，精確且 approximate=false。
2. 4→6，水 1.2 L → 1.8 L，單位原樣保留。
3. 適量鹽 4→6 仍為適量，toTasteCount=1。
4. 1→3，0.001 → 0.003。
5. 3→1，0.001 的真值低於 0.001，顯示小於 0.001 且 approximate=true。
6. 1→1 任意合法數量保持原量且 exact。
7. 2→1，1.005 的 milliUnits=1005，輸出 0.503（half-up）。
8. 2→1，1.001 輸出 0.501（half-up）。
9. 1→2，0 合法，輸出 0，不因零的除法產生錯誤。
10. 1→2，輸入 1000000 → 2000000，數學可顯示且不因輸出大於輸入上限而截斷。
11. 1000000.001 → QUANTITY_TOO_LARGE。
12. 數字 1000000.000 → 接受；1000000.001 → 拒絕。
13. .5、1.、+1、-1、1,000、1e3、阿拉伯/全形數字 → INVALID_QUANTITY。
14. 0、000.500、1.200 → 接受；格式化規則符合文檔。
15. 1.234 → 接受；1.2345 → INVALID_QUANTITY。
16. amount 空字串且 toTaste=false → ROW_INCOMPLETE。
17. toTaste=true 且 amount 非空 → TO_TASTE_AMOUNT_NOT_EMPTY；不可忽略殘留值。UI 切換時必須清空 amount。
18. name trim 後空 → ROW_INCOMPLETE；空白列不能被跳過。
19. name raw length=256可繼續檢查 trim 後長度；257 → NAME_RAW_TOO_LONG。trim 後 80 接受、81 → NAME_TOO_LONG。
20. unit raw length=128可繼續檢查 trim 後長度；129 → UNIT_RAW_TOO_LONG。trim 後24接受、25 → UNIT_TOO_LONG。
21. amount raw length 16且 toTaste=true 仍因非空→TO_TASTE_AMOUNT_NOT_EMPTY；17→AMOUNT_TOO_LONG；amount 型別非string→INVALID_REQUEST。
22. 名稱或單位含 C0/C1 controls → CONTROL_CHARACTER，無結果。
23. servings 1 和 1000 → 接受；0、1001、空、負數、2.0 → INVALID_SERVINGS。
24. servings 原始 4 ASCII 數字上限與前導零：0001 接受且值為1；5位拒絕。
25. 一列接受；零列 TOO_FEW_ROWS；51列 TOO_MANY_ROWS。
26. 第2列不完整 → ROW_INCOMPLETE,row=2，不產生第1列的部分結果。
27. request/row exact schema 缺鍵、多鍵、錯型別、符號鍵、non-enumerable 鍵、accessor 欄位、非 plain object → INVALID_REQUEST。
28. sparse rows array、非 Array.prototype 陣列、帶額外自訂屬性或 symbol 的 rows array → INVALID_REQUEST，不得略過 hole。
29. 50列每列結果順序與輸入相同，summary rowCount=50。
30. 報告 copy 文字保留名稱、數量、單位順序，換行為 LF，不含 HTML。
31. 輸入更改後立刻清空上一結果與報告，copy disabled。
32. servings 或 toTaste 變更同樣使結果失效。
33. copy promise 過期/逆序 resolve/reject 不得更新新 revision 的提示。
34. clipboard missing/reject → readonly fallback 可選，不自動下載。
35. 清除和 pagehide 清除所有輸入與結果；reload 不恢復草稿。
36. 惡意 HTML 字串當食材名稱 → 純文字渲染，不執行。
37. half-up 用 BigInt 整數公式在大數邊界重複執行保持 byte-identical。
38. 2→1，0.001 的精確縮放值為0.0005，half-up tie 顯示0.001 且 approximate=true；以獨立整數 expected 驗證，不轉 Number。

## B：必要人工瀏覽器流程

- zh-Hant/en 各做一次示例 4→6，確認 300g→450g、1.2L→1.8L、適量保持；截圖與實際輸入記錄不可含私有食譜。
- 兩語各編輯其中一列，確認結果消失、copy disabled，再計算新值。
- 兩語各測不完整空列、非法數量、超份數；錯誤清楚定位且 focus 第一錯誤欄。
- 320px、200%縮放、鍵盤完整新增/刪除/計算/複製，檢查標籤、焦點、局部捲動。
- 使用中文 IME/貼上，確認欄位保留合適字符；clipboard 正常與拒絕/缺失路徑分別觀察。
- Network/Storage 手動檢查無外部資料請求、無儲存、無 beacon；無法取證則 NOT_RUN。
- reload/pagehide 後沒有草稿/結果；讀屏通知不要逐列重複朗讀。

## M1 門檻

所有 A、npm test、npm run check、npm run build 通過；雙語主要 B 流程、窄螢幕和 keyboard 必要路徑通過。人工能力未暴露的項目如實 NOT_RUN。交主代理固定版本獨立檢查後才決定 M1。


---

## 原文件 TASKS.md

# 任務與里程碑：食譜份量換算

目前只開始 M1/T00；M2/M3 仍需後續主代理放行。

## M1/T00：雙語本機 MVP

目標：完成 TECHNICAL 核心、雙語 Product App、ACCEPTANCE 全部 A 測試、check/build 與 B 必要瀏覽器流程。

允許修改：本資料夾 public/index.html、public/en/index.html、public/robots.txt、public/styles/**、public/js/**、scripts/**、test/**、package.json、.gitignore 及必要的本工具 M1 配置；進度/交接可更新本資料夾 README.md、START-HERE.md、TASK-ENTRY.md、HANDOFF.md、project.json 與 docs/RELEASE-CANDIDATE.md。證據只可新增到孵化器根 .runs/recipe-scaler/m1-<date>-<id>/**，不得保存使用者食譜/個資。

命令：Node.js 24.x；npm test；npm run check；npm run build；npm run dev 優先綁定 127.0.0.1:4200。若該埠已佔用，不得停止或重用未知程序；用 `server.listen({host:'127.0.0.1',port:0})` 讓作業系統指派可用 ephemeral port，並記錄實際埠及 URL。Spike 優先用 127.0.0.1:5200，佔用時同樣使用該 listen 方式取得 OS 指派的 loopback ephemeral port。長檢查前後執行根 AGENTS 的 persistent environment guard；不得更動持久環境。

非目標：來源發布、正式 SEO/HTTP、Cloudflare、首頁、其他產品。

停止條件：數值案例矛盾、任一 schema 不清、需新依賴或網路/儲存、OS 指派的 loopback port 仍無法啟動、環境 guard drift、需越出允許路徑或遇到秘密資料。不得為解決埠衝突終止既有程序。先保留安全證據並通知主代理。

## M1 凍結及主驗

實作者完整回報檔案、命令結果、瀏覽器觀察、尚未測試與固定 hash 後釋放 ownership。主代理獨立讀 diff/tests 並做主要雙語流程；必要條件未通過就返原對話 M1。實作者不自行放行 M2。

## M2：公開原始碼及 production candidate（需主代理放行）

只有主代理明確放行才開始。M2 建立固定 production build 與 reviewed source 的獨立公開 GitHub repo，不部署 live host。

Allowed paths：M1 已凍結核心演算法與功能行為，不得修改 public/js/core/** 或其語義測試。M2 只可新增/修正 package.json、scripts/** production release helpers、project.json、HANDOFF.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、wrangler.jsonc；允許為正式發布修改 public/index.html 與 public/en/index.html 的 SEO head、同語首頁連結，新增/修改 public/404.html、public/_headers、public/robots.txt、public/sitemap.xml 或其生成器；不得藉此改核心計算、輸入語義或 UI 流程。production build 只在本工具 dist-production/**；reviewed source、manifest 與 evidence 只在孵化器根 .runs/github-publish/glossquote-labs-recipe-scaler/**。不得修改根git、homepage、其他 tool-project。

Commands：npm test、npm run check、npm run build、npm run build:production、npm run check:production、node scripts/manifest.mjs；以 fixed commit 建 source ZIP，解壓到新 reviewed copy 後再跑 npm test、npm run check:production、npm run build:production。ZIP 可由 git -C <reviewed-repo-copy> -c core.autocrlf=false archive --format=zip --output <archive.zip> <commit> 建立，或使用 byte-equivalent 方法；不可改 Git global/system 設定。解壓後逐檔對照固定 commit 的 Git blob bytes/hash，再核 production build manifest。

Exact acceptance：preview 保持 noindex/nofollow；production origin 固定 https://recipe.glossquote.com，不能以 Host/query 改 canonical。中英文 title/description/canonical/zh-Hant/en/x-default/hreflang/JSON-LD/robots/sitemap一致且只列兩個正式 URL。production build 真 404、無 SPA fallback、正確 HTML/CSS/JS/XML/TXT MIME 與 headers。所有命令 exit0；repo https://github.com/KYStr/glossquote-labs-recipe-scaler 實查 PUBLIC、remote HEAD與記錄 commit相同；archive逐Git blob相符，解壓 source重測重建符合預期。

Non-goals：live Cloudflare deploy、DNS與首頁。Stop：任何自動 gate fail、ZIP/blob不相符、repo visibility/HEAD不對、固定host違反、公開副本含 secrets/使用者資料/.runs/dist/node_modules/兄弟產品，或需要新權限/credential；保留證據，不使用force或更動全域設定。

## M3：免費 Cloudflare 與首頁（主代理）

僅主代理序列執行，host 候選 recipe.glossquote.com，使用既有免費 Cloudflare 授權；產品 chat 不讀取或擴張 token。

Allowed paths：主代理可更新本工具 project.json、HANDOFF.md、docs/RELEASE-CANDIDATE.md 和已核准 host release config；首頁只可由主代理改 tool-projects/00-home/catalog.json 及首頁專用生成/驗證檔，不改其他工具。

Commands/checks：本工具 npm run check:production；實際 Cloudflare command 必須來自 root approved release workflow，記錄 literal command/tool version/exit，不暴露 token。正式中英 /index.html 需 HTTPS 200，未知路徑真404、無SPA fallback；核對MIME、CSP/security headers、固定 SEO/canonical/hreflang/robots/sitemap、live bytes。主代理真瀏覽器跑中英文4→6樣例、適量不變、改值後結果失效及copy。工具live通過後才修改首頁catalog為published；在首頁執行 `npm.cmd run build:production`、`npm.cmd run check:generated:production`、`npm.cmd run prepare:production`，再用既有release workflow部署和驗證兩語首頁。

Exact acceptance：source commit、deploy version、正式 URL、首頁 source commit/deploy version分開記錄；首頁兩語顯示新工具並連到對應語言，工具返回同語言首頁。交使用者時狀態 awaiting external review；外審及必要修正確認前不標完成。

Non-goals：付費、DNS/040141.xyz、讀取或擴張 credentials、改其他首頁項目。Stop：要求新權限/token/費用、live SEO/HTTP/body mismatch、HTTPS或首頁不匹配；保留具體失敗證據並回報主代理。

