# 常用單位換算 — 既有規格保存

Task ID: `labs-05-unit-converter` · Spec ID: `spec-05-unit-converter`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：常用單位換算

這是規格，尚未實作。

## 工作與範圍

使用者知道要換算的數值與單位，需要立刻得到可理解的結果。主流程：選類別 → 輸入數值 → 選兩端單位 → 查看結果與公式。不要設首頁導流、帳號或問答聊天。

## 必要需求

| ID | 可觀察行為與硬性規則 |
|---|---|
| FR-01 | 類別只有長度、面積、質量、容量、溫度。單位與順序完全依 TECHNICAL 的封閉表；不接受自訂字串單位。初始為長度、m → cm，數值空白，沒有預先算好的範例。 |
| FR-02 | 數值是文字欄位，原始長度最多 64 UTF-16 code units。只移除首尾 ASCII 空白；接受 ASCII 正負號、小數、科學記號；格式依 TECHNICAL。拒絕逗號、全形數字、運算式、十六進位、NaN、Infinity、非有限值。有效非零輸入絕對值在 1e-12 至 1e12（含）之間；0 可接受。空白是 empty，不視為 0。 |
| FR-03 | 長度／面積／質量／容量必須非負。攝氏最低 -273.15、華氏最低 -459.67、克耳文最低 0；直接在來源單位比較，不用容差放行更低的輸入。下限可接受。不支援負絕對溫度。 |
| FR-04 | 每次輸入或選擇變更即同步換算。任何無效值移除舊結果並標記對應欄位。有效輸出必须有限且絕對值 ≤ 1e18，非零絕對值 ≥ 1e-18，否則顯示結果超出範圍。依固定係數計算，不先四捨五入輸入或中間值。 |
| FR-05 | 結果最多 12 位有效數字，採 TECHNICAL 的明確格式；旁邊固定顯示「顯示最多 12 位有效數字，結果為近似值」。負零顯示 0；不要把浮點顯示位數當成測量精度。附來源數值、單位、目標單位和公式。 |
| FR-06 | 「互換單位」只交換來源與目標選單，數值文字不變，立即重新算。它不把已四捨五入的結果填回輸入。切換類別清空數值／結果／錯誤，套用該類別預設對；相同單位可選，結果與原數值相等。 |
| FR-07 | 「清除」清空數值／結果／錯誤，保留目前類別與兩端單位，焦點回數值。不提供撤銷歷史、匯出檔案或剪貼簿權限；結果可用原生文字選取。同步小運算沒有取消按鈕；清除後不得有延遲回呼寫回舊結果。 |
| FR-08 | 工作資料只在本頁記憶體，不寫 localStorage、sessionStorage、IndexedDB、cookie、URL、日誌或分析。重新整理回初始狀態。初次載入僅同源靜態資產；換算不發出請求。 |
| FR-09 | 鍵盤可操作所有欄位。320 CSS px 和 200% 頁面縮放功能完整。結果使用 output；狀態朗讀只在有效性狀態改變或欄位 change 時提示，不逐字打斷。未支援 ESM／JavaScript 時保留說明並顯示無法啟動。 |

## 預設單位與錯誤

切換類別的預設：length m→cm、area m2→cm2、mass kg→g、volume L→mL、temperature C→F。單位中文名稱、符號都要顯示，例如「公尺 (m)」。溫度選項寫「攝氏 (°C)」「華氏 (°F)」「克耳文 (K)」。

固定錯誤碼：`INPUT_TOO_LONG`、`INVALID_NUMBER`、`INPUT_RANGE`、`NEGATIVE_QUANTITY`、`BELOW_ABSOLUTE_ZERO`、`UNKNOWN_UNIT`、`UNIT_MISMATCH`、`RESULT_RANGE`。空白回 `EMPTY` 狀態，不顯示紅色錯誤。拒絕時不回顯完整原始輸入，不暴露 exception。

## 完成與未來

完成的判準是 ACCEPTANCE 全部必要案例通過、每個常數都有來源、手動網路檢查通過。MVP 不需儲存或檔案處理。更多量綱、分數英吋、單位搜尋、多語言、分享及批次換算各需另外批准；不能因常見就自行加入。


---

## 原文件 TECHNICAL.md

# 技術規格：常用單位換算

這是規格，尚未實作。遵守 [工程規範](docs/ENGINEERING.md) 與 [安全規範](docs/PRIVACY-SECURITY.md)。

## 執行與檔案

原生 HTML/CSS、瀏覽器 ESM，無 runtime dependencies。Node.js 24+ 與 node:test 執行離線測試；禁止遠端字型、CDN、動態下載規則、eval 和 innerHTML。

```text
package.json
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
public/index.html
public/styles/tokens.css
public/styles/app.css
public/js/app.mjs
public/js/core/units.mjs
public/js/core/numbers.mjs
public/js/core/convert.mjs
test/scaffold.test.mjs
test/numbers.test.mjs
test/convert.test.mjs
test/boundaries.test.mjs
docs/RESEARCH.md
docs/VERIFICATION.md
dist/                         # 由 build 產生
```

T00 建立四個 npm scripts：dev=`node scripts/serve.mjs`、test=`node --test`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`。serve 只允許 127.0.0.1:4173 與 public 下白名單檔案，不列目錄或記錄輸入；未知路徑 404、穿越拒絕。check 檢查檔案／ESM 語法、外部資源、危險 DOM API、禁止持久化與網路 API；其字串掃描不能代替人工安全檢查。build 只將審核過的 public 複製至本專案 dist，限制刪除／寫入目標在 dist 內。

## 封閉單位表

以下 id 是程式識別字；括號係數為乘至該類別基準單位的數值。係數按定義採用，實作 Number 仍有浮點誤差。

| 類別／基準 | 固定順序：id、中文、符號、係數 |
|---|---|
| length／m | mm 毫米 mm 0.001；cm 公分 cm 0.01；m 公尺 m 1；km 公里 km 1000；in 英吋 in 0.0254；ft 英呎 ft 0.3048 |
| area／m2 | cm2 平方公分 cm² 0.0001；m2 平方公尺 m² 1；km2 平方公里 km² 1000000；ha 公頃 ha 10000 |
| mass／kg | mg 毫克 mg 0.000001；g 公克 g 0.001；kg 公斤 kg 1；lb 常衡磅 lb 0.45359237 |
| volume／L | mL 毫升 mL 0.001；L 公升 L 1；m3 立方公尺 m³ 1000 |
| temperature／C | C 攝氏 °C；F 華氏 °F；K 克耳文 K；此類用仿射公式，不放進比例係數表 |

非溫度：`result = value * (from.factor / to.factor)`。公式區顯示「來源值 × (來源係數 ÷ 目標係數)」，同時寫明基準單位。不可把面積當成長度係數，也不可把質量當成重量力。

T08 邊界修正：非溫度的輸出範圍由「已驗證 Number 的 `toString()` 標準十進位值 × 封閉來源十進位係數 ÷ 封閉目標十進位係數」精確判定。使用有界 BigInt 分子／分母交叉相乘，0 或 [1e-18,1e18] 才合法；真正超界者不因浮點舍入或 epsilon 放行。合法結果仍用上述 Number 公式計算，只將已證明合法而因二進位舍入越界的結果正規化到對應邊界，再交給嚴格 formatter。這不是任意精度計算或任意長輸入：parseNumber 仍先轉 Number，沒有恢復原始文字被 Number 捨去的精度；BigInt 只負責範圍判定。輸入／溫度限制不採容差。

溫度直接依六種不同單位組合：C→F `x*9/5+32`；F→C `(x-32)*5/9`；C→K `x+273.15`；K→C `x-273.15`；F→K `(x+459.67)*5/9`；K→F `x*9/5-459.67`。相同單位直接回 x。採這些操作次序，讓最低華氏／攝氏值轉 K 時準確得到 0。不得以通用四捨五入掩蓋低於下限的輸入。

## 純函式契約與驗證順序

各模組 export 純函式；沒有 DOM、Date.now 或隱含全域狀態。共用回傳為 `{ok:true,value:...}` 或 `{ok:false,code:固定碼}`；不要回傳輸入或 raw error。

- `parseNumber(raw: string)`：先確認 string 和 64 字元上限；trim 只去 `[\t\n\r ]` 兩端；空字串回 EMPTY；以 `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$` 驗證整串，再 Number，再 Number.isFinite；字面數不為零卻轉為零（例如 1e-999）回 INPUT_RANGE；非零值檢查 1e-12..1e12。判斷字面零時先取 e/E 前的 mantissa 再檢查是否有 1..9，不把指數的非零數字當 mantissa。
- `convert({category,from,to,value})`：僅接受四個自有欄位，拒絕多餘／缺少欄位與非 number；類別與單位都在封閉表且相符；重新驗證數值有限／輸入範圍／符號／溫度下限；按公式算；有限與輸出範圍閘門；`Object.is(result,-0)` 時正規化成 0。
- `formatNumber(value)`：只處理已驗證結果。0→`"0"`；先 `rounded=Number(value.toPrecision(12))`。`abs(rounded)>=1e12` 或 `<1e-6` 用 `rounded.toExponential(11)`，去 mantissa 尾零及末尾小數點，指數用小寫 e、明確正負、沒有前導零。其餘用 `rounded.toFixed(max(0,11-floor(log10(abs(rounded)))))`，僅去小數部分尾零與末尾點。禁止對整數結尾零作刪除。ASCII 小數點、不加千分位；頁面說明這是便於核對的統一格式。
- `getFormula(from,to)` 只用封閉常數產生文字，不插入 HTML。

NaN/Infinity/null/boolean 等直接呼叫 convert 亦須拒絕，不能只依賴 UI。非溫度往返測試容差 `max(1e-12,abs(expected)*1e-12)`；數值格式字串採逐字相等測試。

## 狀態與清理

只有 `empty | valid | invalid | unsupported`。每次 change/input 先清除舊 output，再完整驗證並輸出。沒有 async job、Worker、檔案或計時器，因此不需要取消旗標；不得為微小運算加 debounce 造成舊結果競態。頁面離開釋放事件訂閱與記憶體，不能聲稱可清除瀏覽器／OS 保留的記憶體副本。

## 官方依據與實作研究閘門

2026-09-23 查閱：[NIST 單位換算表 B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8)、[NIST B.9 量綱表](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9)、[NIST SI 前綴](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-4-two-classes-si-units-and-si-prefixes)、[ECMAScript Number](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isfinite)。常數表與產品限制是本專案鎖定選擇；不是動態從官網載入。

T01 逐項核對本表係數與來源，記錄 docs/RESEARCH.md；若發現錯誤先停止該項實作並提出最小修正。驗證本機 Node 版本與瀏覽器 ESM；沒有實測前不得列出支援版本或相容性百分比。


---

## 原文件 UX-SEO.md

# 介面與 SEO：常用單位換算

這是介面與 SEO 規格；實際驗證見 [驗證紀錄](docs/VERIFICATION.md)。模式為 Product App，依 [設計系統](docs/DESIGN-SYSTEM.md) 使用系統字型、暖紙底、墨色文字與適度綠色；單頁不需要產品導覽側欄。

## 版面與工作流程

桌面：

```text
GlossQuote-Labs / 常用單位換算
常用單位換算
類別 [長度 v]
數值 [                    ]
來源 [公尺 m v] [互換單位] 目標 [公分 cm v]
結果  —                       [清除]
公式與精度說明
支援單位／使用方式／常見問題
```

手機：

```text
常用單位換算
類別 [長度 v]
數值 [           ]
來源 [公尺 m v]
[互換單位]
目標 [公分 cm v]
結果與公式
[清除]
說明與常見問題
```

工具區佔第一個畫面最大空間，不放巨幅品牌宣言。常用欄位始終可見；公式緊鄰结果，完整單位說明可折疊。沒有「開始」假按鈕；換算為即時操作，清除是次要按鈕。互換按鈕文字必須完整，旁邊說明「保留輸入數值，交換兩端單位」。

## 狀態文案

| 狀態 | 文案與行為 |
|---|---|
| 初始／清除／空 | 「輸入數值即可換算。」結果顯示破折號，不顯示 0。 |
| 成功 | 「1 m 約等於 100 cm」；下方固定顯示 12 位有效數字限制及公式。 |
| 輸入格式錯誤 | 「請輸入數字，例如 12.5；不接受逗號或運算式。」欄位保留原值供修改。 |
| 超出範圍 | 「數值超出支援範圍。請使用 0，或絕對值 1e-12 至 1e12 的數值。」 |
| 負量／溫度 | 「此類單位請輸入 0 或正數。」／「溫度不可低於絕對零度。」 |
| 結果範圍 | 「結果超出目前支援範圍，請調整數值或單位。」不保留舊結果。 |
| 不支援 | 「此瀏覽器無法啟動工具。請在支援 JavaScript 模組的瀏覽器開啟。」說明仍能閱讀。 |
| 處理中／權限／驗證 | 同步換算沒有長任務、權限或帳號；不造 loading 動畫或登入介面。 |

數字錯誤只當文字；所有動態 DOM 使用 textContent。欄位有 visible label、aria-describedby 與 aria-invalid；結果使用 output 和節制的 polite 狀態。Tab 順序跟畫面一致，Enter 不送出網路表單。每個主要觸控按鈕至少 44 px；焦點双層輪廓，文字／控制對比達標。320 px 不橫向捲頁，長科學記號可換行；200% 頁面縮放、40% 加長標籤、reduced-motion 均可操作。

## 搜尋頁內容草案

- 建議 slug：`/tools/unit-converter/`。
- title：`常用單位換算｜長度、面積、質量、容量與溫度 — GlossQuote-Labs`
- description：`在瀏覽器內換算公分與英吋、公斤與磅、公升與毫升及攝氏華氏等常用單位。顯示換算公式與精度限制，無需上傳數值。`
- H1：`常用單位換算`
- 首段：`選擇類別、輸入數值，再挑選來源與目標單位。結果會在本頁直接更新，方便核對日常尺寸、容量與溫度。`
- 使用方式：選類別；輸入數值；選兩端單位；查看結果與公式。每一項都能在可讀靜態 HTML 中找到。
- FAQ 1「可以換算貨幣嗎？」答「目前只有固定單位，不提供匯率或其他即時資料。」
- FAQ 2「結果完全精確嗎？」答「換算使用固定係數與瀏覽器浮點數運算，畫面最多顯示 12 位有效數字；顯示精度不等於原始測量精度。」
- FAQ 3「可以把攝氏溫差轉成華氏溫差嗎？」答「此工具的溫度欄位代表溫度值，不能用於溫差換算。」
- FAQ 4「數值會儲存嗎？」答「本工具不主動儲存或上傳輸入；重新整理會清空工作內容。」

本地預覽用 `robots=noindex,nofollow`。此階段不生成虛構網域、canonical、sitemap、評論分數或結構化評分。網址確定、驗收完成且另获發布授權後，才產生正式 canonical 與 sitemap。不要宣稱永久免費、全部瀏覽器支援、完全離線啟動、100% 安全或已取得排名。

## 2026-09-29 雙語決定

使用者已選繁體中文與英文。繁中 `/index.html` 的 html.lang=zh-Hant，英文 `/en/index.html` 的 html.lang=en；上方建議 slug 不是已選定的正式 URL。兩頁保留相同 DOM id 與數值操作契約、共用 app 與 core，動態字串由本地 i18n 模組提供。英文 formula 必須呈現對應固定符號／係數，不能改變運算。

title、description、H1、欄位／錯誤／狀態、支援單位、四步教學、數字格式與上下限、精度、溫度值不是溫差及至少四項 FAQ 均完整翻譯。SEO 說明直接存在 HTML，不依賴 JS 才能讀到。英文不殘留中文介面，語言名稱「繁體中文」除外。

語言導覽使用可見的「繁體中文」與「English」原生連結，包含 lang、hreflang 及目前語言 aria-current；附近告知導覽會清空輸入。不自動跳轉，不保存偏好，不把工作資料放進網址。兩語皆須驗證 320px、鍵盤與真實縮放；不能以靜態語法測試取代可操作性。

本機保留 noindex，正式 URL 相關設定依 [SEO-RELEASE](docs/SEO-RELEASE.md) 另行完成；目前語言導覽不冒充已完成搜尋引擎 hreflang 設定。人工待驗按使用者授權保留 NOT_RUN，不阻擋實作進度。


---

## 原文件 ACCEPTANCE.md

# 驗收：常用單位換算

這是規格，尚未實作；以下均為未執行的預期案例。不得提前勾選通過。

自動測試用本文件字面假數值，不讀私人資料。純函式容差只適用數值：`max(1e-12,abs(expected)*1e-12)`；格式字串與錯誤碼必須完全相等。手動測試需記錄瀏覽器實際版本、日期、viewport、結果與缺陷到 docs/VERIFICATION.md。

| ID／需求 | 種類 | 輸入／步驟 | 預期 |
|---|---|---|---|
| U01／01,04 | 自動 | 1 m→cm | 100；format=`100` |
| U02／04 | 自動 | 1 in→cm | 2.54；format=`2.54` |
| U03／04 | 自動 | 1 ft→m | 0.3048 |
| U04／04 | 自動 | 1 ha→m2；1 m2→cm2 | 10000；10000 |
| U05／04 | 自動 | 1 lb→kg | 0.45359237 |
| U06／04 | 自動 | 1 m3→L；2500 mL→L | 1000；2.5 |
| U07／03,04 | 自動 | 0 C→F；212 F→C；-40 C→F | 32；100；-40 |
| U08／03 | 自動 | -273.15 C→K；-459.67 F→K | 0；0；format 均為 `0` |
| U09／03 | 自動 | -273.1501 C→K；-0.01 K→C | BELOW_ABSOLUTE_ZERO，無結果 |
| U10／02,03 | 自動 | -1 m→cm；`-0` m→cm | NEGATIVE_QUANTITY；0 且不是負零 |
| U11／02 | 自動 | ` 1.25e2 `；`.5`；`1.`；空字串 | 125；0.5；1；EMPTY |
| U12／02 | 自動 | `1,000`、`0x10`、`１２`、`1+2`、`NaN`、`Infinity`、`1e999` | 各 INVALID_NUMBER；沒有部分解析 |
| U13／02 | 自動 | `1e-999`；`1e-13`；`1e13`；65 個 `0` | 前三 INPUT_RANGE；最後 INPUT_TOO_LONG |
| U14／02,04 | 自動 | `1e-12` km→m；`1e12` km2→cm2 | 1e-9；RESULT_RANGE（結果 1e22） |
| U15／01,04 | 自動 | 類別 length、from=m、to=kg；未知 to=`script`；多出欄位 `x` | UNIT_MISMATCH；UNKNOWN_UNIT；INVALID_NUMBER（封閉函式 request 形狀錯誤固定映射） |
| U16／04,05 | 自動 | 1 cm→in；formatNumber(1e-7)、(1e12)、(1000) | 數值約 .3937007874015748，字串 `0.393700787402`；`1e-7`、`1e+12`、`1000` |
| U17／04 | 自動 | convert value 直接傳 NaN/Infinity/null/true | 全部 INVALID_NUMBER；不返回 Infinity/NaN |
| U18／06,07 | 手動 | 輸入 2 m→cm；互換；清除 | 先 200；再 0.02（輸入仍 2）；清除後空，保留 cm→m，焦點數值 |
| U19／06 | 手動 | 長度有效結果後切換溫度 | 數值／結果清空，C→F；沒有舊結果 |
| U20／08 | 手動 | DevTools Network 清空後換算／互換／清除；重整 | 操作 0 個請求；無外部網路；storage 無工作資料，重整恢復初始 |
| U21／02,09 | 手動 | 貼入 `<img src=x onerror=alert(1)>` | 格式錯誤，不執行、不建立 img、不發網路；清除可恢復 |
| U22／09 | 手動 | 僅鍵盤完成換算、互換、清除 | 所有可達、可見焦點、錯誤可讀、無焦點陷阱 |
| U23／09 | 手動 | 320 px 寬；200% 頁面縮放；標籤加長 40% | 不橫向捲整頁、不遮擋欄位、核心功能相同 |
| U24／09 | 手動 | 禁用 JavaScript；或模組載入失敗 | 靜態說明與不支援文案可讀，不能假裝已有結果 |

另加程式迴圈測試每一類允許的單位對；取 0、1、123.456 及可行邊界，換算再換回應落容差內。溫度另取每個單位下限及 -40／0／100 對應值。這驗證係數一致性，不取代 U02–U08 的獨立標準值。

取消不適用：換算為同步有界純函式，無背景工作；以 U18 清除與快速 input 確認無舊值回寫。權限／認證不適用，產品沒有相關 API。發布不在此驗收範圍。


---

## 原文件 TASKS.md

# 實作任務：常用單位換算

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

## 最新完成：T08 稽核 F-01 修正（2026-09-29，PASS）

主代理必要驗收與 GitHub 同步已通過，詳見 VERIFICATION／GITHUB-PUBLISH。正式網站發布與既有人工待驗不計為本次通過；本輪未開始下一個 milestone。

- 依使用者提供的 audit 與「修正一下」授權，修正四種十進位數學結果等於 1e-18 卻被 RESULT_RANGE 拒絕的換算；先完成本 milestone 再推進其他功能。
- allowed paths：本文件、`public/js/core/convert.mjs`、`test/convert.test.mjs`、`test/audit-boundary.test.mjs`、`TECHNICAL.md`、`docs/RESEARCH.md`、`docs/SEO-RELEASE.md`、`docs/VERIFICATION.md`、`docs/GITHUB-PUBLISH.md`、`HANDOFF.md`；`dist/**` 只由 build 產生；工作區 `.runs/unit-audit-fix/**` 僅作本機驗證證據。發布副本只更新相同產品檔及面向使用者的 README，沿用 T07 明確公開 GitHub 授權，不包含網站部署。
- 設計：非溫度比例換算用已驗證 Number 的標準十進位字串與封閉係數的十進位字串轉為有界 BigInt 分數，精確判定非零結果是否在 [1e-18,1e18]。只有數學上合法的结果才保留既有浮點公式，必要時將計算舍入造成的邊界偏移正規化至合法邊界後交給嚴格 formatter。不得用通用 epsilon 放寬真正超界值；不承諾任意精度輸出，原始文字仍先由 parseNumber 轉成 Number。
- 不可破壞：先驗證 request/有限值/輸入範圍/符號；輸入限制、溫度下限及六公式、formatNumber 範圍與 12 有效位、五類20單位、兩語 UI、無網路／持久化、無新相依套件均保持。
- 委派：UC-AUDIT-CORE 給 Luna/max，只改 convert.mjs；UC-AUDIT-TEST 給另一 Luna/max，只改既有 convert.test.mjs 與新增 audit-boundary.test.mjs。兩者獨立路徑，最多兩位，禁止再委派。主代理處理數值決策、文件、獨立 oracle／瀏覽器／完整驗收與推送。
- 驗收：四組案例均精確回傳 1e-18 並顯示 `1e-18`；上下界等值及相鄰內／外浮點數正確分類，真正超界仍拒絕；原有防禦與溫度案例保留；Node >=24 的 test/check/build 通過，dist/public 一致，兩語真實 HTTP 頁面的8組回歸通過。主代理獨立檢查 diff 與數值 oracle，再驗證 GitHub commit 與檔案樹。
- 非目標：新工具／新單位、介面重設、購買或猜測正式網域、開放索引、託管設定、部署。E-01/E-02/S-01 明列為正式發布任務及驗收條件；手機鍵盤、AT、真實 Network/Storage 等無法執行者保留 NOT_RUN，不以靜態測試冒充。
- 停止條件：需要改變係數或溫度契約、任意精度輸入、相依套件、超出允許路徑、遠端不明變更、憑證／權限／永久環境變更，必須先回報。

本文件定義實作任務；實際完成證據以 HANDOFF.md／docs/VERIFICATION.md 為準。只依序做一項；依 AGENTS.md 的 session 閱讀規則讀取當前任務所需內容。路徑皆相對本獨立專案根目錄。未列路徑不得修改；受阻寫 HANDOFF.md，不能悄悄降低验收。

2026-09-29 使用者授權更新：允許把工具無法執行的人工項目保留 NOT_RUN 後繼續實作；已知缺陷與可執行的必要測試仍不可跳過。每次只做一個工具網站，完整實作繁體中文＋英文與 SEO 後再做下一個。這不是發布授權，也不等於人工待驗項已通過。

## T00 建立可檢查的空專案

- 前置：完整閱讀 START-HERE 與共用 docs；確認目前只在本專案操作。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 工作：設 private=true、type=module、engines Node >=24、四個 TECHNICAL 命令、不加 dependencies；建靜態標題與 noindex。serve 只供 public／loopback；check 真查 ESM 語法、必要檔案與禁止模式，build 限 public→dist。scaffold 測試覆蓋路徑穿越／未知路徑不能讀出 public 以外資料。
- 驗收：先 `node --version` 確認 24+；建立腳本後才執行 `npm test`、`npm run check`；`npm run dev` 人工讀本地頁、非法路徑被拒絕後停止 server。無需 npm install。
- 完成：命令實際成功，HANDOFF 記錄命令與結果；此時不寫產品通過。

## T01 核對係數與瀏覽器基線

- 前置：T00 通過。
- allowed paths：`docs/RESEARCH.md`、`HANDOFF.md`。
- 工作：核對 TECHNICAL 每個係數／溫度公式與官方來源，記錄查閱日期與差異；驗證本機瀏覽器 ESM、output、CSS 支援。記錄未測平台，不擴充單位表。
- 驗收：人工逐行核對封閉表和公式；`npm run check`。
- 完成：常數無未解疑義，HANDOFF 指向研究紀錄；來源衝突則停在此步詢問，不寫程式補猜。

## T02 數字／換算核心

- 前置：T01 通過。
- allowed paths：`public/js/core/units.mjs`、`public/js/core/numbers.mjs`、`public/js/core/convert.mjs`、`test/numbers.test.mjs`、`test/convert.test.mjs`、`HANDOFF.md`。
- 工作：按封閉表及純函式契約實作；測 U01–U17；增加單位對往返案例；先驗證後計算，禁止用 parseFloat 放行尾部垃圾。
- 驗收：`node --test test/numbers.test.mjs test/convert.test.mjs`、`npm run check`。
- 完成：精確格式與數值容差分開断言、全測試通過，HANDOFF 列實測 ID。

## T03 接上可操作介面

- 前置：T02 通過。
- allowed paths：`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：依 UX 線框建表單、即時結果、公式、錯誤、互換及清除；全用安全文字 DOM，完成 U18、U19、U22、U23。
- 驗收：`npm test`、`npm run check`、`npm run dev`；人工操作桌面及 320 px／200% 頁面縮放畫面，記錄結果後停止 server。
- 完成：核心流程與焦點通過，HANDOFF 記錄瀏覽器版本及仍待驗收項。

## T04 邊界與隱私修補

- 前置：T03 可執行檢查通過；依 2026-09-29 授權保留人工 NOT_RUN。
- allowed paths：`public/js/app.mjs`、`public/js/core/numbers.mjs`、`public/js/core/convert.mjs`、`public/index.html`、`public/styles/app.css`、`test/boundaries.test.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：有界生成 malformed 字串、非 number、邊界值測試；人工 U20、U21、U24；驗證新輸入不殘留舊結果、清除無 race；只修實際缺陷。
- 驗收：`npm test`、`npm run check`，Network／storage／禁用 JS 人工檢查。
- 完成：無外部流量／持久化／HTML 注入，HANDOFF 記錄限制與證據；無法取得必要瀏覽器驗證則保留未驗，不宣稱完成。

## T05 繁中／英文靜態網站、SEO 與本地建置（M04）

- 前置：T04 可執行檢查通過；人工 NOT_RUN 有具體限制與補驗步驟。
- allowed paths：`public/index.html`、`public/en/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/i18n.mjs`、`test/i18n.test.mjs`、`test/seo.test.mjs`、`docs/VERIFICATION.md`、`docs/SEO-RELEASE.md`、`HANDOFF.md`、`UX-SEO.md`、`README.md`、`START-HERE.md`、`dist/**`（只由 build 產生）。此擴充來自本次明確多語言要求，不修改 core、既有測試、scripts 或 tokens。
- 非目標：其他工具、框架、runtime 套件、遠端翻譯、帳號、追蹤、正式網域設定、部署、排名保證。
- 語言與 URL：繁中 `public/index.html`（lang=zh-Hant）、英文 `public/en/index.html`（lang=en）；兩頁有可見原生文字連結與 lang/hreflang 屬性、目前語言 aria-current。中文用 ./en/index.html，英文用 ../index.html；資產用正確相對路徑。切換為正常導覽，先告知會清空輸入，不在 query/hash/storage 搬移輸入，不依瀏覽器語言自動跳轉。
- 共用介面契約：保留現有所有表單 id、狀態／焦點／清除／互換行為與三個 core 模組。各頁完整靜態翻譯標題、欄位、幫助、精度、限制、教學、FAQ、不支援提示；不能只在載入後用 JS 翻譯整頁。app 只由 document.documentElement.lang 選擇固定本地 i18n 字串，翻譯五類別、20 單位、錯誤、empty/result/formula。數值文法與最多12有效位ASCII顯示契約保留；英文說明同樣限制。
- i18n 模組可提供字典及顯示公式 adapter；未知單位依 core 拒絕，不新建可執行表達式、不以翻譯字串改變計算。英文公式須包含對應符號／來源／目標與係數，六種溫度公式與既有core契約一致。中文 getFormula 的既有行為及測試不變。
- SEO：每語言獨有且自然的 title、description、唯一 H1；靜態 HTML 包含支援單位、4步教學、精度／溫度值非溫差／數字格式限制、至少四個真實 FAQ。不要堆關鍵字、捏造使用量／評分或產生同義頁。語言頁的搜尋內容完全翻譯，工具區優先。
- 本機預覽：保留 robots=noindex,nofollow、既有 CSP 與無外部資源。不填虛構/localhost 的 canonical、SEO head hreflang 或 sitemap；正式絕對網址未知，發布前依 docs/SEO-RELEASE.md 生成自指 canonical、雙向含自身的絕對 hreflang（zh-Hant/en，可加 x-default）與 sitemap，明確區分一般語言連結和正式 SEO annotations。
- 自動驗收：npm.cmd test、npm.cmd run check、npm.cmd run build；i18n 測兩語鍵完整、錯誤與六溫度公式、不可變核心行為；SEO 測兩頁 lang/title/description/H1/靜態內容/互連/ID唯一與完整/無假canonical及有效相對資產。測試不得只照抄實作回傳值，必須核對獨立預期。
- 瀏覽器驗收：兩語直接開啟、換算／互換／清除／錯誤／切類別、語言導覽、鍵盤與320px；英文不得殘留中文介面（語言切換的「繁體中文」名稱除外）。真200%／AT／Network等無法執行者保留NOT_RUN。檢查dist逐檔與public一致且不含文件／測試／输入。
- 完成：可執行檢查通過、無已知功能阻塞，人工與發布前SEO待驗明列；不宣稱完整驗收或已發布。

## T06 最終驗收與交接

- 前置：T05 可執行檢查通過，人工待驗依授權保留；全工具實作已完成再做此最終交接。
- allowed paths：`docs/VERIFICATION.md`、`HANDOFF.md`、`dist/**`（只允許既有 build 輸出）。
- 工作：逐項跑 ACCEPTANCE 全部案例；確認 diff 限已授權路徑；列完成需求、未支援能力、測試平台、已知問題、下一步。
- 驗收：`npm test`、`npm run check`、`npm run build`（只使用 T05 已授權的建置輸出流程，不人工改 dist）；瀏覽器完整回歸。
- 完成：只有全部必需項通過才寫「本機 MVP 驗收完成，尚未發布」。發現缺陷回到對應任務修正，不能在本任務擴大 allowed paths。

## T07 GitHub 公開原始碼交付（2026-09-29 使用者新增授權）

- 使用者明確要求上傳自己的 GitHub 並設定公開，之後自行檢查。此新授權涵蓋本工具原始碼的提交、建立公開儲存庫及推送，取代先前「不提交／不發布」對此動作的限制；不包含其他工具、GlossGate 歷史、網站託管、付費或域名。
- milestone 範圍：以目前已登入帳號 KYStr，建立獨立 glossquote-labs-unit-converter 公開儲存庫；若同名已存在，先確認歸屬與內容，不覆蓋未知遠端。
- allowed paths：本文件、HANDOFF.md、docs/GITHUB-PUBLISH.md；發布副本僅在工作區 .runs/github-publish/glossquote-labs-unit-converter/** 建立。只複製 package.json、public/**、scripts/**、test/*.test.mjs；新增面向使用者的 README.md 與 .gitignore。不複製既有 Git 歷史、本機交接／環境快照、.codex、cache、其他產品或任何憑證。
- 委派 UC-GH-DOCS：Luna/max 只製作發布副本 README.md 與 .gitignore；主代理複製固定來源、審查發佈清單、測試、提交、推送與驗證。最多2個子代理，不再委派。
- 驗收：發布副本與原產品程式逐檔一致；53項離線測試、check/build通過；staged檔案均在明確清單且無本機路徑／機密；GitHub API 確認 private=false、遠端commit與本機一致、檔案樹一致。
- 非目標：GitHub Pages、網站正式上線、移除noindex、設定公開SEO網址、選擇新程式授權、修改產品功能。人工待驗仍明示，不阻擋使用者已要求的原始碼公開交付。
- 停止：認證失敗、遠端歸屬不明、同名內容衝突、疑似秘密／個資、測試失敗或需要擴張權限時回報；不讀取或輸出帳號憑證，不繞過安全限制。

