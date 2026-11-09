# 翻譯檔缺漏檢查 — 既有規格保存

Task ID: `labs-52-locale-check` · Spec ID: `spec-52-locale-check`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 翻譯檔缺漏檢查 產品規格
這是規格；實際狀態見[HANDOFF](HANDOFF.md)。

## 使用者與工作
網站上線前有兩份語系JSON，想一次找出漏翻、額外key及被翻壞的插值變數，免使用者看到空白或{name}。
使用者拿到：以參考JSON對照翻譯JSON，路徑級缺漏/多餘/型別/變數差異報告，可選只看待修並下載JSON/TXT。。核心工作在一個頁面完成，不引導去其他產品才能完成基本流程。

## 可觀察需求
- FR-01 來源與界線：每份1MiB、5000葉節點、深度32；僅object和string葉，禁止array/null/number/bool，拒解碼後重複key與__proto__等危險key但不可賦值prototype。路徑以segment陣列識別避免含點key碰撞。變數語法明確只{{name}}或{name}兩種使用者擇一，不冒稱支援ICU；每個葉比較變數多重集合，空翻譯與等原文僅warning且不視為必錯。
- FR-02 核心結果：按[TECHNICAL](TECHNICAL.md)精確演算法產生真實結果，沒有亂數假資料、只示範不可用按鈕或隱藏缺項。數字與文字規則不能自行猜測。
- FR-03 初始空頁，明確載入標示的假例子才能出現示例。主要工作可自填與清除，出錯指向欄位並保留可修改來源，舊成功輸出立即失效。
- FR-04 使用者每次更改來源、設定、匯入/匯出模式，先同步清除已準備的結果與可下載/複製狀態。所有非同步讀取與生成帶generation，晚到結果丟棄並釋放資源。同步小量運算不顯示假取消。
- FR-05 下載是真正本地產物，固定安全ASCII檔名，不使用使用者文字組路徑。Blob URL由controller單一擁有，替換/clear/pagehide撤銷；點下載後至少容許瀏覽器接管再撤銷，最遲30秒。複製僅明確點按且成功Promise才顯示成功，拒絕有可選文字替代。
- FR-06 輸入只記憶體，無storage/history/query/network/log/telemetry/遠端資源。明確語言切換會失去本頁未匯出資料。禁止以本機處理宣稱完全安全抹除或所有裝置支援。
- FR-07 繁中與英文完整功能、錯誤、結果、FAQ對應；各自靜態index.html與en/index.html。低性能裝置安全退出，無雲端fallback。
- FR-08 鍵盤可完成核心流程，320px/200%縮放不遺失操作，所有欄位有label，狀態非僅顏色，下載/匯入確認頁內不叫OS dialog作測試。
- FR-09 文字只textContent/value；輸出HTML只固定模板escape，不執行輸入。控制字元/Unicode/大小/schema邊界見技術契約，整份拒絕不得偷偷丟壞列。
- FR-10 完成M1不等於release。M2必要browser驗收後由原對話公開GitHub，主代理hosting/雙語首頁整合，再待外部複驗。

## 精確例子
參考{"a":{"x":"Hi {name}"},"b":"B"}，翻譯{"a":{"x":"嗨 {user}"},"c":"C"}=>missing b/extra c/變數name缺user多。a.b literal key不等nested a→b。

## 非目標
無帳戶/多人同步/自動寄送/自動保存/雲端分析；不讀本機其他檔案、不接外部服務。特定格式與語意限制見TECHNICAL，不偷偷擴充。資料或來源實際消失前有相應確認（清除整個頁面可明確按清除，不假稱可復原）。


---

## 原文件 TECHNICAL.md

# 技術契約 — 翻譯檔缺漏檢查
這是規格，Node24與瀏覽器原生ESM，零runtime/dev依賴，禁止npm install。正式站純靜態。

## 模組與介面
public/index.html、en/index.html、404.html、_headers、styles/app.css、js/app.mjs、js/controller.mjs、js/locales/zh-Hant.mjs與en.mjs；純核心於js/core/：parse-locale.mjs、placeholders.mjs、compare.mjs、session.mjs。test/*.test.mjs；scripts/check.mjs、build.mjs、serve.mjs；package.json/private/type module/engines>=24。
parseLocale(text) -> {leaves:[{path:string[],value:string}],warnings}; compareLocales(reference,target,{syntax}) -> {issues,counts}; extractVariables(text,syntax) -> Map<string,number>。固定error.code，不在error塞原字串。
核心不引用DOM、File、storage、network或console。controller擁有FileReader/bitmap/BlobURL與generation，不在核心塞副作用。

## 確定算法及資料契約
JSON 必須自行使用有界遞迴下降 parser 或獨立token掃描搭配JSON.parse，解碼字串後同一object內以Set拒絕重複key（包含a與\u0061）。不能單用JSON.parse而遺失重複key。所有key以Map或無prototype容器儲存，拒__proto__/constructor/prototype；string葉可空，空object合法但不能冒充string葉。最大depth32（root是1）、每key200 UTF16、string16384、5000葉、10000屬性、原UTF8 1MiB。拒未配對surrogate。型別只object或string，array/null/number/bool一律TYPE錯，並顯示所在path只作文字。
以JSON.stringify(path array)作內部識別，不能用'.'join。比較reference葉集合與target葉集合；如果某path在另一側為object，標type-conflict且其子樹缺漏不重複灌報，規則寫入測試。缺key=missing、多key=extra，變數按大小寫敏感多重集合計missingVariables/extraVariables。single模式只認{name}、double只認{{name}}；name為ASCII [A-Za-z_][A-Za-z0-9_]*。不支援ICU、%s、巢狀plural，不將不認識括號冒稱成功：對含未匹配或其他括號語法的葉加UNSUPPORTED_PLACEHOLDER_SYNTAX warning，仍保留可檢查其他key的結果。單模式不得把{{name}}中的內層當單變數。空翻譯、與原文相同都只是review warning，不算確認缺陷。
差異依參考葉原遍歷順序，extra依target順序。所有filter僅切可見，不改下載完整report。同步核心但UI按檢查才運算；可用worker與單一jobId，若同步實作則無假取消。來源/語法改動立即清空結果及可下載性。

## 共同狀態與失效
idle→editing→running（僅async）→ready/error；來源/設定input同步revision++、停用下載/複製、清輸出；cancel終止worker/reader，晚到generation不可restore。pagehide清資源。未知exception轉固定雙語錯誤碼，不回顯raw stack或輸入。保留明確的unsupported安全退出。
可引用既有兄弟工具作唯讀研究，但本工具必須複製自己需要且經審查的模組並帶測試，不runtime import兄弟工具。

## 工具鏈
scripts/check.mjs實驗ESM語法、public靜態allowlist、雙語結構、安全禁止項；純regex只初步掃描不作安全證明。build拒symlink/junction/unknownfile，只複製public封閉清單到dist，舊未知輸出不任意刪除。serve只loopback 127.0.0.1:4232，GET/HEAD，精確MIME/path/Host與404/405，不能提供workspace。M1不啟動serve。
來源UTF8，文本匯出UTF8無BOM、JSON兩空格LF尾LF。結構化資料匯入依工具自訂exact schema與上限，危險prototype不能進object assignment。下載無公式CSV（如需報告用TXT/JSON，避免發明CSV防護承諾）。


---

## 原文件 UX-SEO.md

# 工作區與雙語SEO
這是規格，Product App模式，遵守[設計系統](docs/DESIGN-SYSTEM.md)。
左右來源textarea各有選檔與清除；下方語法選擇、檢查翻譯；摘要列missing/extra/variables/review；可過濾差異表，path以分段視覺顯示。手機上下來源、diff局部橫捲。

```text
桌面：工具名 / 語言 / 返回首頁
      [來源與相鄰設定] [主要工作畫布或結果]
      [欄位錯誤/限制] [明確產出動作]
手機：工具名 → 來源/設定 → 主動作 → 結果 → 匯出
```
初始「加入資料開始 / Add data to begin」；進行「處理中，可取消 / Processing, you can cancel」（只async）；空結果「沒有符合的項目 / No matching items」；invalid「請修正標示欄位，舊結果已清除 / Fix the marked fields; the previous result has been cleared」；不支援顯示必要能力與停止。單一primary action隨階段變化，禁多層等高卡片/巨型hero。真人資料不預填。
鍵盤順序依實際工作；44px觸控、兩層focus、正常字4.5:1、控制邊3:1。320px周邊重排，表格/畫布可具名局部捲動；200%/reduced motion。所有日期/數字含必要單位、結果長字容錯。labels/錯誤/id兩語對照，勿靠placeholder。

## 真實文案
繁中title：翻譯檔缺漏檢查｜本機處理工具 - GlossQuote
繁中H1：翻譯檔缺漏檢查
繁中description：網站上線前有兩份語系JSON，想一次找出漏翻、額外key及被翻壞的插值變數，免使用者看到空白或{name}。 使用 翻譯檔缺漏檢查，在瀏覽器本地整理資料並取得可下載成果。
English title: Translation file completeness checker | GlossQuote
English H1: Translation file completeness checker
English description: Translation file completeness checker in your browser. Review the result and export it locally without uploading your input.
工具說明必須以PRODUCT的完整使用情境與結果翻譯，不只翻按鈕。至少以下FAQ兩語可見：
### 這能判斷翻譯品質嗎？
不能；它核對欄位、字串與明確支援的插值變數，不判斷語意。

### Does this assess translation quality?
No. It checks keys and supported placeholder syntax, not linguistic quality.

### 支援 ICU 嗎？
首版不支援 ICU；不認識的括號語法列為待人工確認。

### Is ICU supported?
No. Unsupported brace syntax is flagged for review.

### 同原文代表漏翻嗎？
不一定，品牌名與數字可能應保留；只提供提醒。

### Is unchanged text an error?
No. Names and numbers may intentionally match; this is a review warning.

## Preview與正式
M1 robots noindex,nofollow，無production canonical/sitemap，不能偽造live。首頁固定https://glossquote.com/index.html / https://glossquote.com/en/index.html；切換/en/index.html及/index.html不附任何輸入。domain候選locale-check.glossquote.com，不是已部署網址。
M2/M3主代理放行後production每頁自指canonical；hreflang zh-Hant/en/x-default（fallback繁中）互返，robots/sitemap精確兩網址，title/description/H1各語，SoftwareApplication JSON-LD只寫可見真實能力無rating。CSP default-src self; connect-src none; frame-ancestors none、nosniff、no-referrer等依release契約，實際HTTP再驗。沒有analytics/font/CDN。未知路徑真404不是首頁200。


---

## 原文件 ACCEPTANCE.md

# 驗收契約
這是規格，未執行項不能預填PASS。需求對照[PRODUCT](PRODUCT.md)。
|案例|需求|輸入/步驟|精確預期|層級|
|---|---|---|---|---|
|A01 同一檔案|FR-01/02/04/09|{"x":"Hi {name}"}對同內容，single|0error/0missing/0extra；same-source warning可有1|Node純核心/假controller；非真browser|
|A02 錯變數|FR-01/02/04/09|{"x":"Hi {name}"}對{"x":"嗨 {user}"}|缺name1，多user1，path["x"]|Node純核心/假controller；非真browser|
|A03 多次使用|FR-01/02/04/09|{x} {x}對{x}|缺x1|Node純核心/假controller；非真browser|
|A04 空譯文|FR-01/02/04/09|{"x":"Hi"}對{"x":""}|warning empty；非missing|Node純核心/假controller；非真browser|
|A05 解碼後重複|FR-01/02/04/09|{"a":"1","\u0061":"2"}|DUPLICATE_KEY|Node純核心/假controller；非真browser|
|A06 路徑碰撞|FR-01/02/04/09|{"a.b":"X","a":{"b":"Y"}}|2不同path，不覆蓋|Node純核心/假controller；非真browser|
|A07 型別衝突|FR-01/02/04/09|ref{"a":"x"},target{"a":{"b":"y"}}|a type-conflict，不另列a.b extra|Node純核心/假controller；非真browser|
|A08 惡意key|FR-01/02/04/09|{"__proto__":"x"}|UNSAFE_KEY；Object.prototype未變|Node純核心/假controller；非真browser|
|A09 深度界線|FR-01/02/04/09|root計1，32層/33層|32接受/33 DEPTH_LIMIT|Node純核心/假controller；非真browser|
|A10 Unicode|FR-01/02/04/09|{"x":"\ud800"}|INVALID_UNICODE|Node純核心/假controller；非真browser|
|A11 雙括號|FR-01/02/04/09|{{name}} single/double|single unsupported警告且0variables/double name1|Node純核心/假controller；非真browser|
|A12 完整輸出|FR-01/02/04/09|filter只missing後下載|仍含extra/variable完整issues|Node純核心/假controller；非真browser|

## 必要M1 gate
Node24+；npm test含上述精確期望且expected不可由被測實作生成。npm run check真查結構與安全；npm run build真產物；source前後hash一致，實際證據寫evidence/m1。反例須確認錯輸入拒絕且成功結果失效。所有測試假資料，不讀個人文件；不得裝套件或啟動瀏覽器。

## 必要browser/release gate（目前NOT_RUN_USER_FOCUS_INCIDENT）
- B01 兩語真實輸入→主要操作→預覽→本地下載，下載byte內容符合核心且使用者可拿走使用。
- B02 成功後改來源/設定與錯值，舊輸出立即失效；快速重選/clear/cancel不復活。
- B03 惡意文字只文字，Network完整初載/操作/隱藏/離頁、同源/cdn-cgi/rum均核對；Storage前後無使用者資料。
- B04 鍵盤完整流程、焦點不受遮擋、讀屏label/status、320px、200%、mobile真機、權限拒絕、下載/列印原生行為獨立記錄。
- B05 中文英文切換與首頁互連、正式canonical/hreflang/x-default/robots/sitemap/安全HTTP與真404。
只用主代理確認真正隔離機制，禁止CUA/hidden-IAB/桌面/native/key/IME/clipboard測試。Node假DOM/Canvas/Audio與靜態檔不能冒充B01–05。手動NOT_RUN授權不等必要release gate全免除。


---

## 原文件 TASKS.md

# B20-52 M1任務
這是完整本地候選的有界里程碑，尚未實作。原功能chat gpt-6.1-sol/max；不自行再委派。T00..T04必要前置通過即可在同輪接續，主代理結尾整合驗收。

Allowed paths（每項只在此工具）：package.json、.gitignore、public/**、scripts/**、test/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**；dist/**僅build生成。禁止修改這六份規格/AGENTS/docs、兄弟工具、root、共享首頁/看板/舊證據；主代理不與owner並改。若規格錯誤，回報具體衝突與建議，不自行放寬。

T00 建scaffold：讀全部規格與AGENTS。建立上列package/scripts/test、最小disabled初始化雙語HTML。node --version，建立後npm test/check/build。不得引用不存在命令。check/build有反例可拒違規檔。通過後T01。
T01 核心：依TECHNICAL各純函式與ACCEPTANCE精確案例實作。只改core/test/HANDOFF證據。npm test及check。邊界先驗且不要只做happy path。通過後T02。
T02 完整UI：雙語app/controller/locales/html/css，接實際core與使用者輸入、來源編輯/預覽/清除/匯出。實作PRODUCT全部基本流程，不只顯示範例結果。Node契約與mock僅按scope記錄；browser NOT_RUN。npm test/check/build。通過後T03。
T03 輸出與競態：實作下載、匯入確認（若產品需要）、generation/cancel/cleanup、壞輸入恢復、兩語errors及FAQ，增加必要回歸。npm test/check/build。原生另待驗。通過後T04。
T04 固定候選：最終完整npm test、npm run check、npm run build對同一來源，記files bytes/SHA/actual command exit/pass/fail/NOT_RUN於evidence/m1和HANDOFF；在final回報實際修改、結果、風險和下一步，交主代理。不要只交計畫，不自己做M2。

停止條件：缺依賴/安裝/付費/憑證/未知persistent環境drift/要碰其他owner或桌面/browser，或同問題兩輪沒有進展，停止相依部分並回報；保留可獨立進行工作。長測試前後現有environment guard；所有子程序shell:false windowsHide、絕不改User/Machine PATH。

M1完成不等發布。M2主代理必要browser驗收後讓此原chat獨立public GitHub（KYStr/glossquote-labs-locale-check），不得globalauth/config寫入且前後Gitguard；M3主代理免費部署與首頁/看板；M4外驗後原chat返工。不得自動跳階段、輪詢或冒稱全產品通過。

