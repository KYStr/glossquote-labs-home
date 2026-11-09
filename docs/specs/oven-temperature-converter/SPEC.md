# 烤箱溫度換算 / Oven Temperature Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-oven-temperature-converter-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md) · [預案品質說明](../../SPECIFICATION-STOCK.md)

## goal

在家烘焙的人對著外國食譜與自家烤箱旋鈕，一次把 °C、°F、Gas Mark 三種標示對齊，並同時得到一般烤箱與旋風（熱風）烤箱的設定，不必心算 9/5、也不必背 Gas 對照表。

- 桌面。桌邊對照食譜與烤箱面板，輸入一個溫度後同時讀兩種烤箱、四種單位的結果與完整對照表。
- 行動。手機在廚房單手輸入，結果區與對照表在窄版直排可讀，不啟動任何工作。

使用情境為換算假設。資料只保留在目前頁面草稿。

## scope

MVP 必做：單一溫度輸入，單位為 °C、°F 或 Gas Mark；基準標明輸入值是一般烤箱或旋風烤箱的設定；輸出一般與旋風兩種烤箱各自的 °C、°F、Gas Mark；頁面常駐完整的 Gas Mark 對照表（14 列）。非目標為烘焙時間換算、食譜份量縮放、肉品中心溫度或食品安全判斷、烤箱品牌專屬刻度、溫度探針或計時器、儲存／分享／列印結果。

已與 registry 及既有預案比對，最相近者的實質差異如下。

- 通用單位換算（長度、重量、溫度等一般單位，legacy）。此處只做烤箱溫度，核心是 Gas Mark 對照表與旋風調整慣例，通用換算器兩者皆無。`spec-unit-converter`（docs/specs/unit-converter）。
- 以使用量級距計算電費。此處是食譜與烤箱刻度對照，與電費無關。`spec-electricity-cost-calculator-20261109`。

判定規則由本文定義：Gas 對照表為廣泛刊載的標準表（見 inputsOutputs），公式與調整值皆在本文釘死，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果、對照表直排。首屏見主工作與對照表開頭，詳細說明用一層 disclosure。

- 欄位或說明「溫度與單位 / Temperature and unit」：數值輸入框加單位選擇（攝氏 °C／華氏 °F／Gas Mark）。
- 欄位或說明「這個溫度是哪種烤箱的設定 / This setting is for」：一般烤箱／旋風烤箱二選一。選 Gas Mark 單位時旋風選項停用並說明原因（Gas 刻度沒有旋風設定）。
- 「換算溫度 / Convert temperature」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（Gas Mark 4、一般烤箱），明示範例並等待手動執行。
- 「一般烤箱與旋風烤箱的設定 / Conventional and fan settings」先摘要兩種烤箱的 °C 設定再列完整結果。一般與旋風各一組：°C、°F、Gas Mark（超出對照表時顯示「超出對照表範圍（低於 Gas ¼）/ Outside the chart (below Gas Mark ¼)」或「（高於 Gas 10）/ (above Gas Mark 10)」）。其下常駐「Gas Mark 對照表 / Gas Mark reference chart」靜態表，14 列依 Gas 由小到大，不隨輸入改變。文字可手動選取。本工具沒有下載或匯出。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。對照表照常顯示。 |
| dirty | 任一輸入、單位、基準或範例改變，立即撤銷舊結果。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。編輯終止舊工作並回 dirty。 |
| success | 結果對應目前快照。Gas 超出對照表是正常結果的一部分，不是錯誤。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"value":"180","unit":"celsius","basis":"conventional"}` 並聚焦溫度欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算；核心為同步純函數，不使用 Worker，busy 只涵蓋一個事件迴圈回合，不假造進度。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

固定資料 — Gas Mark 標準對照表（來源：廣泛刊載的標準 Gas Mark 對照表，如 BBC Good Food 與 Wikipedia「Gas mark」條目所載的通行版本；本表為唯一依據，實作不得另查或改值）。°F 欄是刊載的慣用成對值，不是公式結果；兩欄各自獨立，換算規則見下文步驟。

| Gas Mark | °C | °F |
| --- | --- | --- |
| ¼ | 110 | 225 |
| ½ | 120 | 250 |
| 1 | 140 | 275 |
| 2 | 150 | 300 |
| 3 | 170 | 325 |
| 4 | 180 | 350 |
| 5 | 190 | 375 |
| 6 | 200 | 400 |
| 7 | 220 | 425 |
| 8 | 230 | 450 |
| 9 | 240 | 475 |
| 10 | 260 | 500 |

欄位與文法（raw 皆為字串）：

- `value`：ASCII 十進數，正規式 `^-?(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`，無空白／正號／指數；raw 最多 8 個 UTF-16 code units。`-0` 視為 0。預設 `"180"`。
- `unit`：`"celsius"`、`"fahrenheit"` 或 `"gas"` 之一；raw 最多 16 units。預設 `"celsius"`。
- `basis`：`"conventional"`（輸入值是一般烤箱設定）或 `"fan"`（輸入值是旋風烤箱設定）之一；raw 最多 16 units。預設 `"conventional"`。
- 範圍：celsius 輸入 −50–350，fahrenheit 輸入 −58–662（即 −50°C 與 350°C 的公式等價值），gas 輸入必須恰為對照表 14 個 Gas 值之一（以數值相等判定，`"0.50"` 與 `"1.0"` 合法）。

驗證順序（整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null；成功僅為 `{ok:true,result}`；資源失敗用固定 INTERNAL，不回傳堆疊）：

1. SCHEMA：形狀、欄位集合、型別、accessor，field=null。
2. 依 value、unit、basis 欄位順序逐欄檢查：raw 超長 INPUT_LIMIT（field 即該欄）；未成對 surrogate UNICODE（field 即該欄）。
3. value：空字串 EMPTY；文法不符 DECIMAL_FORMAT。
4. unit、basis：不在列舉值內 ENUM（field 即該欄，依 unit 後 basis 順序）。
5. 跨欄：unit 為 gas 且 basis 為 fan → FAN_GAS，field 為 `"basis"`（Gas 刻度沒有旋風設定，一般烤箱是 Gas 唯一的基準）。
6. 值域：unit 為 gas 且數值不在對照表 → GAS_VALUE，field 為 `"value"`；unit 為 celsius／fahrenheit 且超出範圍 → RANGE，field 為 `"value"`。

換算管線（驗證通過後；全程以精確有理數運算，只在輸出步驟捨入，任何輸出都不得由另一個已捨入的輸出推導）：

1. 旋風調整先於單位換算、且只在輸入單位的領域套用一次：unit 為 celsius 時調整量 20（°C），fahrenheit 時 25（°F），兩者不疊加。basis 為 conventional 時，輸入值即一般值，旋風值 = 輸入值 − 調整量；basis 為 fan 時，輸入值即旋風值，一般值 = 輸入值 + 調整量。unit 為 gas 時不經此步：先查表得一般 °C（步驟 2），旋風 °C = 一般 °C − 20。
2. 求一般與旋風各自的精確 °C：celsius 直接採用；fahrenheit 以 °C = (°F − 32) × 5/9；gas 以對照表 °C 欄（一般端）。旋風端的精確 °C 由步驟 1 的旋風原始值（或 gas 的一般 °C − 20）同法求得。
3. 每一端獨立輸出 `{celsius, fahrenheit, gasMark, gasMarkRange}`：
   - `celsius`：精確 °C 四捨五入到最近整數，平手（恰 .5）遠離零。
   - `fahrenheit`：由精確 °C 以 °F = °C × 9/5 + 32 求精確值，再同法捨入到最近整數。例外：輸入本身是 gas 時，一般端的 fahrenheit 直接用對照表 °F 成對值（如 Gas ½ 是 250，不是公式的 248）；旋風端與所有非 gas 輸入一律走公式。
   - `gasMark`：以精確 °C 在對照表 °C 欄找距離最近的列；距離相等（恰在兩列正中間）取 °C 較高（較高溫）的列。標籤為 `"¼"`、`"½"`、`"1"`…`"10"`。精確 °C < 110 時 gasMark 為 null、gasMarkRange 為 `"below"`；> 260 時為 null、`"above"`；其餘 gasMarkRange 為 `"in"`。gas 輸入的一般端 gasMark 即輸入列本身。
4. 結果 `{conventional, fan}`，兩端皆依步驟 3 輸出。機器值不隨 locale 改；Gas 標籤用 ¼（U+00BC）與 ½（U+00BD）字元。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/oven-temperature-converter/`。`public/js/core/` 放純驗證、對照表資料、換算與捨入（精確有理數以整數分子分母表示，不用浮點累積誤差決定平手）；`public/js/app.js` 用安全 DOM API 綁表單與狀態；`public/index.html` 和 `public/en/index.html` 為兩個靜態入口，對照表以靜態內容寫入兩頁。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。核心 `run` 為同步純函數；controller 在下一個事件迴圈回合以世代號執行快照，只收目前世代且 busy 的結果，取消、換來源、重設或 pagehide 時丟棄待執行回合，bfcache 回來重設。不用 Worker（計算為 O(1)，假造非同步進度反而誤導），不假造進度條。
- 表格與結果用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算溫度」，畫面結果符合核心 fixtures（含 Gas 表列優先、°F 公式、旋風調整與平手取較高溫列），對照表 14 列與本文固定表逐格相同。 |
| boundaries | 合法端點（−50/350°C、−58/662°F、Gas ¼ 與 10）、剛好越界、第一個錯誤、平手點（115/160/185°C 等中點）與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限和世代丟棄（取消／晚到結果不復活）。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和 Gas 超出對照表的呈現可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、取消與 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。11 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected；平手與捨入案例須能以本文規則手算複核。

| 案例 ID | 驗證行為 |
| --- | --- |
| `gas-input-basic` | Gas 輸入取表列成對值；旋風 160°C 的 Gas 列平手取較高溫列 |
| `gas-half-table-pair` | Gas ½ 的 °F 是表列 250 而非公式 248 |
| `celsius-formula` | °C 輸入的 °F 走公式（392），Gas 以最近列判定 |
| `fahrenheit-fan-adjust` | °F 輸入先減 25°F 再換算；°C 由精確值捨入 |
| `gas-tie` | 185°C 恰在兩列中點，平手取較高溫列 Gas 5 |
| `fan-basis-input` | 輸入為旋風設定時一般值加回 20°C |
| `above-table` | 高於 260°C 時 Gas 為 null 並標 above |
| `below-table` | 低於 110°C 時 Gas 為 null 並標 below |
| `error-fan-gas` | Gas 輸入搭配旋風基準回 FAN_GAS |
| `error-gas-value` | 非表列 Gas 值 3.5 回 GAS_VALUE |
| `error-range` | 351°C 回 RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 controller 回合。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可用性。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證所有對照表列作為 gas 輸入時一般端逐格回表列值；115、130、145、160、175、185、195、210、225、235、250°C 十個中點全數取較高溫列；由 °F 輸入的 Gas 判定用精確換算 °C 而非已捨入 °C；旋風調整在 °C 與 °F 輸入下不疊加。

候選 gate（均 NOT_RUN）

- 於 `tools/oven-temperature-converter/` 記 Node 24.x，執行 `npm test`（core/controller/HTML/建置）、`npm run check`（語法、外部依賴、危險 sink、allowlist）、`npm run build:preview`（重建兩次並逐檔比對排序後的 SHA-256）、`npm run check:generated:preview`。測試僅合成資料及本機檔案。
- 以 loopback 靜態伺服供隔離預覽（scripts/serve.mjs）。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「烤箱溫度換算」，title「烤箱溫度換算｜Gloss Tools」，description「食譜寫 °C、°F 還是 Gas Mark？一次換算三種標示，還能對照一般烤箱與旋風烤箱的設定，附完整 Gas Mark 對照表。」。英文 lang=en，H1 “Oven Temperature Converter”，title “Oven Temperature Converter | Gloss Tools”，description “Convert oven temperatures between Celsius, Fahrenheit and Gas Mark, with conventional and fan-assisted settings and the full Gas Mark chart.”。兩頁靜態呈現操作、限制、對照表、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。旋風烤箱為什麼要調低？旋風（熱風）循環使熱效率較高，慣例是把一般烤箱溫度調低 20°C（以 °F 表示的食譜慣例調低 25°F）；本工具依輸入單位套用對應調整，先調整再換算。 / Why lower the temperature for a fan oven? Moving air heats more efficiently, so the convention is 20 °C lower (25 °F for Fahrenheit recipes); this tool applies the adjustment for the entered unit before converting.
- FAQ。溫度超出對照表怎麼辦？低於 Gas ¼（110°C）或高於 Gas 10（260°C）時，°C 與 °F 照公式換算，Gas Mark 顯示超出範圍。 / What if the temperature is outside the chart? Below Gas Mark ¼ (110 °C) or above Gas Mark 10 (260 °C), Celsius and Fahrenheit still convert by formula and the Gas Mark is shown as out of range.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://oven-temperature-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。規格任務 id `labs-oven-temperature-converter-spec-20261109`（由主代理登記）。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/oven-temperature-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
