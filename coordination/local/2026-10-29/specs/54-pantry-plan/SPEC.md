# 食材差額採買單 — 既有規格保存

Task ID: `labs-54-pantry-plan` · Spec ID: `spec-54-pantry-plan`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 食材差額採買單 產品規格
這是規格；實際狀態見[HANDOFF](HANDOFF.md)。

## 使用者與工作
煮幾道菜時同一食材分散在不同食譜，家裡也有一些，想一次知道到底還要買多少。
使用者拿到：輸入各料理材料需求與庫存，按材料名稱與相容單位合併、扣庫存，得到購物清單/足夠項目與來源明細。。核心工作在一個頁面完成，不引導去其他產品才能完成基本流程。

## 可觀察需求
- FR-01 來源與界線：最多30料理/300需求列/300庫存列；數量0..1e6最多3小數、整數基準g/ml/piece；kg↔g、L↔ml、count同名計數單位；不能質量體積互轉或推測密度。材料名NFC+trim精確匹配、不合併同義詞；使用者可明確改名。採買=max(總需求-庫存,0)。無飲食/營養/效期安全判斷。
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
米需求500g+0.75kg，庫存300g =>還買950g；牛奶500ml與500g各自兩列，不能合成1kg。

## 非目標
無帳戶/多人同步/自動寄送/自動保存/雲端分析；不讀本機其他檔案、不接外部服務。特定格式與語意限制見TECHNICAL，不偷偷擴充。資料或來源實際消失前有相應確認（清除整個頁面可明確按清除，不假稱可復原）。


---

## 原文件 TECHNICAL.md

# 技術契約 — 食材差額採買單
這是規格，Node24與瀏覽器原生ESM，零runtime/dev依賴，禁止npm install。正式站純靜態。

## 模組與介面
public/index.html、en/index.html、404.html、_headers、styles/app.css、js/app.mjs、js/controller.mjs、js/locales/zh-Hant.mjs與en.mjs；純核心於js/core/：quantities.mjs、shopping.mjs、schema.mjs、session.mjs。test/*.test.mjs；scripts/check.mjs、build.mjs、serve.mjs；package.json/private/type module/engines>=24。
parseQuantity(text)->bigint千分之一單位; normalizeIngredient(name)->string; calculateShopping({meals,stock})->{buy,enough,unmatchedStock}; validateProject(value)->validated schema1。
核心不引用DOM、File、storage、network或console。controller擁有FileReader/bitmap/BlobURL與generation，不在核心塞副作用。

## 確定算法及資料契約
每個數量原字串只接受ASCII十進位0..1000000最多3小數，不允許e/+/-/空字串；0合法表示暫不需。BigInt千分之一份為base。g以mg為整數、kg乘1000到g；ml以千分之一ml為base，L乘1000到ml。piece或自訂count單位以千分之一個保留，不猜顆/個/包等同義。unit只能g/kg/ml/L/piece/customCount；customCount需1..20字且NFC trim精確識別。材料名NFC.trim，保留大小寫與內部空白，1..120字。key=(材料名,dimension,customCountName)，不能只名稱合併。需求名稱同但dimension不同要顯示無法互換提示並各列保留。
預設新料理1份；M1不做食譜份數縮放（既有20號負責），直接填本次真正需求。meal{id,name,items[{ingredient,quantity,unit,unitLabel}]}至多30/總300列；stock同型300列。重複需求/庫存加總，合計最多1000000000 base顯示單位（以BigInt比較），超限拒整批。buy=max(required-stock,0)，surplus=max(stock-required,0)。輸出預設g/ml/piece或customCount，去小數尾零；g999顯示999g，不自動換kg以免採買誤認。全部都有零餘額時顯示不需額外購買。
所有項都附來源料理名/原量與扣掉庫存量明細，可勾已買只影響本頁進度不再重扣庫存；修改來源重置勾選、輸出失效。不提供熱量/營養/保存安全建議。提供schema1 JSON明確下載/載入，無storage。匯入2MiB，exactkeys/唯一id/上限/不安全控制字元驗證，頁內預覽後確認替換，取消原狀。TXT購物清單與完整JSON報告均含未合併單位說明。

## 共同狀態與失效
idle→editing→running（僅async）→ready/error；來源/設定input同步revision++、停用下載/複製、清輸出；cancel終止worker/reader，晚到generation不可restore。pagehide清資源。未知exception轉固定雙語錯誤碼，不回顯raw stack或輸入。保留明確的unsupported安全退出。
可引用既有兄弟工具作唯讀研究，但本工具必須複製自己需要且經審查的模組並帶測試，不runtime import兄弟工具。

## 工具鏈
scripts/check.mjs實驗ESM語法、public靜態allowlist、雙語結構、安全禁止項；純regex只初步掃描不作安全證明。build拒symlink/junction/unknownfile，只複製public封閉清單到dist，舊未知輸出不任意刪除。serve只loopback 127.0.0.1:4234，GET/HEAD，精確MIME/path/Host與404/405，不能提供workspace。M1不啟動serve。
來源UTF8，文本匯出UTF8無BOM、JSON兩空格LF尾LF。結構化資料匯入依工具自訂exact schema與上限，危險prototype不能進object assignment。下載無公式CSV（如需報告用TXT/JSON，避免發明CSV防護承諾）。


---

## 原文件 UX-SEO.md

# 工作區與雙語SEO
這是規格，Product App模式，遵守[設計系統](docs/DESIGN-SYSTEM.md)。
上方料理分組需求表、旁邊現有庫存可摺疊；主要按鈕產生採買清單；結果以還要買優先、已有足夠另折疊，單項可展開來源，手機一欄編輯與清單。

```text
桌面：工具名 / 語言 / 返回首頁
      [來源與相鄰設定] [主要工作畫布或結果]
      [欄位錯誤/限制] [明確產出動作]
手機：工具名 → 來源/設定 → 主動作 → 結果 → 匯出
```
初始「加入資料開始 / Add data to begin」；進行「處理中，可取消 / Processing, you can cancel」（只async）；空結果「沒有符合的項目 / No matching items」；invalid「請修正標示欄位，舊結果已清除 / Fix the marked fields; the previous result has been cleared」；不支援顯示必要能力與停止。單一primary action隨階段變化，禁多層等高卡片/巨型hero。真人資料不預填。
鍵盤順序依實際工作；44px觸控、兩層focus、正常字4.5:1、控制邊3:1。320px周邊重排，表格/畫布可具名局部捲動；200%/reduced motion。所有日期/數字含必要單位、結果長字容錯。labels/錯誤/id兩語對照，勿靠placeholder。

## 真實文案
繁中title：食材差額採買單｜本機處理工具 - GlossQuote
繁中H1：食材差額採買單
繁中description：煮幾道菜時同一食材分散在不同食譜，家裡也有一些，想一次知道到底還要買多少。 使用 食材差額採買單，在瀏覽器本地整理資料並取得可下載成果。
English title: Pantry-aware shopping list | GlossQuote
English H1: Pantry-aware shopping list
English description: Pantry-aware shopping list in your browser. Review the result and export it locally without uploading your input.
工具說明必須以PRODUCT的完整使用情境與結果翻譯，不只翻按鈕。至少以下FAQ兩語可見：
### 可以把克換成毫升嗎？
不能。不同材料密度不同，請用同類單位。

### Can grams convert to millilitres?
No. Mass and volume remain separate.

### 同名材料會自動合併嗎？
名稱去頭尾空白後精確相同且單位相容才合併，不猜同義詞。

### How are ingredients grouped?
By the trimmed exact name and compatible unit dimension.

### 會記住我的庫存嗎？
不會自動保存；請下載專案JSON，下次自行匯入。

### Is inventory saved automatically?
No. Export and re-import the project JSON when needed.

## Preview與正式
M1 robots noindex,nofollow，無production canonical/sitemap，不能偽造live。首頁固定https://glossquote.com/index.html / https://glossquote.com/en/index.html；切換/en/index.html及/index.html不附任何輸入。domain候選shopping-list.glossquote.com，不是已部署網址。
M2/M3主代理放行後production每頁自指canonical；hreflang zh-Hant/en/x-default（fallback繁中）互返，robots/sitemap精確兩網址，title/description/H1各語，SoftwareApplication JSON-LD只寫可見真實能力無rating。CSP default-src self; connect-src none; frame-ancestors none、nosniff、no-referrer等依release契約，實際HTTP再驗。沒有analytics/font/CDN。未知路徑真404不是首頁200。


---

## 原文件 ACCEPTANCE.md

# 驗收契約
這是規格，未執行項不能預填PASS。需求對照[PRODUCT](PRODUCT.md)。
|案例|需求|輸入/步驟|精確預期|層級|
|---|---|---|---|---|
|A01 質量合併|FR-01/02/04/09|500g+0.75kg，stock300g|buy950g|Node純核心/假controller；非真browser|
|A02 體積合併|FR-01/02/04/09|0.5L+250ml，stock0.25L|buy500ml|Node純核心/假controller；非真browser|
|A03 不可互轉|FR-01/02/04/09|奶500g與500ml|兩個dimension各500，不合併|Node純核心/假controller；非真browser|
|A04 無欠量|FR-01/02/04/09|need3piece stock5|buy0 surplus2|Node純核心/假controller；非真browser|
|A05 部分單位|FR-01/02/04/09|need1.5piece stock0.5|buy1|Node純核心/假controller；非真browser|
|A06 規格空白|FR-01/02/04/09|材料 米 與米|trim後同名；米 A與米  A不同|Node純核心/假controller；非真browser|
|A07 單位標籤|FR-01/02/04/09|包與袋|customCount不同，不猜等同|Node純核心/假controller；非真browser|
|A08 壞數字|FR-01/02/04/09|1e3/-1/+1/1.0001|INVALID_QUANTITY|Node純核心/假controller；非真browser|
|A09 累加|FR-01/02/04/09|同庫存A2g+A3g|stock5g只扣一次總量|Node純核心/假controller；非真browser|
|A10 零|FR-01/02/04/09|need0g stock0g|無需購買，不NaN|Node純核心/假controller；非真browser|
|A11 匯入取消|FR-01/02/04/09|舊米/新麵preview cancel|仍舊米|Node純核心/假controller；非真browser|
|A12 惡意文字|FR-01/02/04/09|料理<img>|安全純文字，TXT原字串不執行|Node純核心/假controller；非真browser|

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

# B20-54 M1任務
這是完整本地候選的有界里程碑，尚未實作。原功能chat gpt-6.1-sol/max；不自行再委派。T00..T04必要前置通過即可在同輪接續，主代理結尾整合驗收。

Allowed paths（每項只在此工具）：package.json、.gitignore、public/**、scripts/**、test/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**；dist/**僅build生成。禁止修改這六份規格/AGENTS/docs、兄弟工具、root、共享首頁/看板/舊證據；主代理不與owner並改。若規格錯誤，回報具體衝突與建議，不自行放寬。

T00 建scaffold：讀全部規格與AGENTS。建立上列package/scripts/test、最小disabled初始化雙語HTML。node --version，建立後npm test/check/build。不得引用不存在命令。check/build有反例可拒違規檔。通過後T01。
T01 核心：依TECHNICAL各純函式與ACCEPTANCE精確案例實作。只改core/test/HANDOFF證據。npm test及check。邊界先驗且不要只做happy path。通過後T02。
T02 完整UI：雙語app/controller/locales/html/css，接實際core與使用者輸入、來源編輯/預覽/清除/匯出。實作PRODUCT全部基本流程，不只顯示範例結果。Node契約與mock僅按scope記錄；browser NOT_RUN。npm test/check/build。通過後T03。
T03 輸出與競態：實作下載、匯入確認（若產品需要）、generation/cancel/cleanup、壞輸入恢復、兩語errors及FAQ，增加必要回歸。npm test/check/build。原生另待驗。通過後T04。
T04 固定候選：最終完整npm test、npm run check、npm run build對同一來源，記files bytes/SHA/actual command exit/pass/fail/NOT_RUN於evidence/m1和HANDOFF；在final回報實際修改、結果、風險和下一步，交主代理。不要只交計畫，不自己做M2。

停止條件：缺依賴/安裝/付費/憑證/未知persistent環境drift/要碰其他owner或桌面/browser，或同問題兩輪沒有進展，停止相依部分並回報；保留可獨立進行工作。長測試前後現有environment guard；所有子程序shell:false windowsHide、絕不改User/Machine PATH。

M1完成不等發布。M2主代理必要browser驗收後讓此原chat獨立public GitHub（KYStr/glossquote-labs-pantry-plan），不得globalauth/config寫入且前後Gitguard；M3主代理免費部署與首頁/看板；M4外驗後原chat返工。不得自動跳階段、輪詢或冒稱全產品通過。

