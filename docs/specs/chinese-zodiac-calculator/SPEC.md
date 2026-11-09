# 農曆生肖查詢 / Chinese Zodiac Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-chinese-zodiac-calculator-20261109` · 2026-11-09 · v1

[預案品質與補庫說明](../../SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

依國曆出生日期查出正確的農曆生肖，解決「1 月、2 月出生到底屬今年還是去年生肖」這個最常見的混淆，並讓使用者能核對答案的依據。

- 桌面。家長替新生兒填出生登記或彌月資料，輸入出生日期，立即確認生肖、干支與該生肖年的起訖日期。
- 行動。手機上替自己或家人查生肖，順手填今天日期看是否本命年，或看下一個本命年是哪一年。

判定只用本頁草稿內的固定春節日期表，不連網、不查外部曆表。使用情境為民俗查詢，結果是文化慣例資訊，不是命理判斷。資料只保留在目前頁面草稿。

## scope

MVP 必做：

- 生肖年交界固定為農曆正月初一（春節，CNY）。出生日期 ≥ 出生年春節日 → 屬該年生肖；出生日期 < 出生年春節日 → 屬前一年生肖。
- 春節日期表寫死於本文 inputsOutputs，涵蓋生肖年 1960–2035，另含 1959（下界）與 2036（上界）兩列邊界列，使範圍內每一天都可判定。
- 生肖由公式錨定：生肖年 Y 的動物序 = (Y − 4) mod 12，序 0 = 鼠（4 年為鼠年）。天干序 = (Y − 4) mod 10，序 0 = 甲；五行由天干決定（甲乙木、丙丁火、戊己土、庚辛金、壬癸水）。
- 輸出含生肖年起訖、是否春節前出生、本命年判定與下一個本命年（填查詢日期時）。

非目標：

- 以立春（約 2 月 4 日）為干支年交界的八字／命理算法。兩者在春節與立春之間的出生日期可能給出不同生肖年；本工具只採春節制，介面固定文案揭露此差異，不提供切換。
- 農曆生日換算、農曆整年曆表、時柱／日柱、出生時刻與時區換算（判定粒度固定為國曆日期，不看時刻）。
- 運勢、性格、配對、擇日等占卜內容；1960-01-01 以前與 2035-12-31 以後的出生日期（一律 OUT_OF_RANGE，不外推）；生肖年 1959 以前與 2036 以後的完整查詢（1959 與 2036 僅作邊界列）。

已與本 repo 101 份既有預案比對，最相近者的實質差異如下。

- 西洋星座查詢（zodiac-sign-finder，本批平行預案）：以國曆月／日對熱帶黃道十二宮的固定日期表，不看年份、不看農曆交界。此處以農曆春節為年界，同一天在不同年份可屬不同生肖，且需要逐年春節表。
- 月相計算機（moon-phase-calculator，本批平行預案）：以平均朔望月公式推算月齡與月相。此處不做天文推算，春節日是寫死的曆法事實表。
- 入學學年計算機（school-entry-year，本批平行預案）：以 9 月 1 日法定年齡線推學年。此處以農曆年界推生肖年，規則與資料表皆不同。

判定規則與日期表由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「出生日期 / Birth date」——國曆日期，必填。
- 欄位或說明「查詢日期（選填） / As-of date (optional)」——填了才判定本命年與下一個本命年；留空不影響生肖結果。
- 「查詢生肖 / Find my sign」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（出生日期 2025-01-15、查詢日期留空），明示範例並等待手動執行。
- 結果先給生肖與干支摘要，再列生肖年起訖、春節前／後標記與本命年資訊。固定揭露句常駐結果區：「本工具以農曆正月初一（春節）為生肖交界；八字命理以立春交界者，結果可能不同。/ This tool switches the zodiac year at Chinese New Year (lunar 1/1); BaZi traditions that switch at Li Chun may differ.」
- 成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果區含固定揭露句。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"birthDate":"","asOfDate":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

輸入欄位（皆為字串）：

- `birthDate`：必填。國曆出生日期，文法固定 `YYYY-MM-DD`（恰 10 字元：4 位年、連字號、2 位月、連字號、2 位日；只接受 ASCII 數字與 `-`，無空白、無符號、無其他分隔符）。raw 最多 32 code units。須為真實日曆日（格里曆，含閏年規則：年可被 4 整除且（不被 100 整除或可被 400 整除）為閏年）。有效範圍 1960-01-01 至 2035-12-31（含端點）。
- `asOfDate`：選填，空字串 `""` 表示未提供（不是錯誤）。非空時文法與日曆日規則同上，raw 最多 32 code units，有效範圍 1960-01-01 至 2036-12-31（含端點）。與 birthDate 無先後限制，不做跨欄順序檢查。

驗證順序固定：先 SCHEMA，再依欄位順序 birthDate、asOfDate 逐欄檢查，每欄依序 INPUT_LIMIT（raw 超過 32 code units）→ UNICODE（不成對 surrogate）→ EMPTY（僅 birthDate；空字串或欄位值為空）→ DATE_FORMAT（不符合 `YYYY-MM-DD` 文法）→ DATE_INVALID（文法合但非真實日曆日，如 2025-02-29、2025-04-31、月份 00 或 13）→ OUT_OF_RANGE（真實日期但超出該欄有效範圍）。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

判定算法（全為日期整數運算，無時刻、無時區、無浮點）：

1. 令 B = birthDate 的（年 Yb、月、日）。查表得 CNY(Yb)（Yb 必在 1960–2035，表內有列）。
2. 若 B ≥ CNY(Yb)，生肖年 Z = Yb，beforeCny = false；若 B < CNY(Yb)，Z = Yb − 1，beforeCny = true。（B 恰為春節日當天屬新生肖年。）
3. animalIndex = (Z − 4) mod 12（數學正餘數，結果 0–11）；stemIndex = (Z − 4) mod 10（0–9）。動物、地支、天干、五行查下方固定屬性表。
4. spanStart = CNY(Z)；spanEnd = CNY(Z + 1) 的前一日（日期減 1）。Z 可為 1959（B 在 1960 年春節前）至 2035；因表含 1959 與 2036 邊界列，spanStart 與 spanEnd 永遠可由表內兩列相減得到，不外推。
5. asOfDate 非空時：令其年為 Ya，先以 CNY(Ya) 比較得暫定 Za（asOf ≥ CNY(Ya) 則 Ya，否則 Ya − 1；Ya = 2036 時同理，Za 可為 2036）。asOfZodiacYear = Za。isBenMingNian = （Za 的 animalIndex == 出生的 animalIndex）。
6. nextBenMingNianYear = 下一個本命生肖年：若 isBenMingNian 為 true，取 Za + 12；否則取大於 Za 且 (Y − 4) mod 12 == animalIndex 的最小 Y。nextBenMingNianStart = 該年 ≤ 2036 時為 CNY（該年），否則 null（超出表範圍時只給年，不給日期，不外推）。

固定屬性表（序即公式索引，不得以其他來源覆寫）：

| 序 | 動物 zh | 動物 en | 地支 zh | 天干序對應 |
| --- | --- | --- | --- | --- |
| 0 | 鼠 | Rat | 子 | — |
| 1 | 牛 | Ox | 丑 | — |
| 2 | 虎 | Tiger | 寅 | — |
| 3 | 兔 | Rabbit | 卯 | — |
| 4 | 龍 | Dragon | 辰 | — |
| 5 | 蛇 | Snake | 巳 | — |
| 6 | 馬 | Horse | 午 | — |
| 7 | 羊 | Goat | 未 | — |
| 8 | 猴 | Monkey | 申 | — |
| 9 | 雞 | Rooster | 酉 | — |
| 10 | 狗 | Dog | 戌 | — |
| 11 | 豬 | Pig | 亥 | — |

天干序：0 甲、1 乙、2 丙、3 丁、4 戊、5 己、6 庚、7 辛、8 壬、9 癸。五行：甲乙 → 木 Wood；丙丁 → 火 Fire；戊己 → 土 Earth；庚辛 → 金 Metal；壬癸 → 水 Water。干支 ganzhiZh = 天干字 + 地支字（如 甲辰）。羊的英文固定 Goat（不用 Sheep/Ram）。生肖與干支皆以純文字呈現，不使用 emoji 圖示。

春節日期表（固定資料，唯一判定來源）。每列為該生肖年正月初一的國曆日期（中國標準時間民用曆日）。1959 與 2036 為邊界列：1959 列只用於 1960 年春節前出生者的 spanStart 與生肖年判定；2036 列只用於 spanEnd 與 asOfDate 判定及 nextBenMingNianStart。來源為公開曆表之農曆正月初一國曆日期（作者查核紀錄見 AUTHOR-CHECK.md）；此表為本工具的固定契約，日後任何曆表修訂不自動改變本表，修訂須走規格修訂流程。

| 年 | 春節 | 年 | 春節 | 年 | 春節 | 年 | 春節 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1959 | 1959-02-08 | 1979 | 1979-01-28 | 1999 | 1999-02-16 | 2019 | 2019-02-05 |
| 1960 | 1960-01-28 | 1980 | 1980-02-16 | 2000 | 2000-02-05 | 2020 | 2020-01-25 |
| 1961 | 1961-02-15 | 1981 | 1981-02-05 | 2001 | 2001-01-24 | 2021 | 2021-02-12 |
| 1962 | 1962-02-05 | 1982 | 1982-01-25 | 2002 | 2002-02-12 | 2022 | 2022-02-01 |
| 1963 | 1963-01-25 | 1983 | 1983-02-13 | 2003 | 2003-02-01 | 2023 | 2023-01-22 |
| 1964 | 1964-02-13 | 1984 | 1984-02-02 | 2004 | 2004-01-22 | 2024 | 2024-02-10 |
| 1965 | 1965-02-02 | 1985 | 1985-02-20 | 2005 | 2005-02-09 | 2025 | 2025-01-29 |
| 1966 | 1966-01-21 | 1986 | 1986-02-09 | 2006 | 2006-01-29 | 2026 | 2026-02-17 |
| 1967 | 1967-02-09 | 1987 | 1987-01-29 | 2007 | 2007-02-18 | 2027 | 2027-02-06 |
| 1968 | 1968-01-30 | 1988 | 1988-02-17 | 2008 | 2008-02-07 | 2028 | 2028-01-26 |
| 1969 | 1969-02-17 | 1989 | 1989-02-06 | 2009 | 2009-01-26 | 2029 | 2029-02-13 |
| 1970 | 1970-02-06 | 1990 | 1990-01-27 | 2010 | 2010-02-14 | 2030 | 2030-02-03 |
| 1971 | 1971-01-27 | 1991 | 1991-02-15 | 2011 | 2011-02-03 | 2031 | 2031-01-23 |
| 1972 | 1972-02-15 | 1992 | 1992-02-04 | 2012 | 2012-01-23 | 2032 | 2032-02-11 |
| 1973 | 1973-02-03 | 1993 | 1993-01-23 | 2013 | 2013-02-10 | 2033 | 2033-01-31 |
| 1974 | 1974-01-23 | 1994 | 1994-02-10 | 2014 | 2014-01-31 | 2034 | 2034-02-19 |
| 1975 | 1975-02-11 | 1995 | 1995-01-31 | 2015 | 2015-02-19 | 2035 | 2035-02-08 |
| 1976 | 1976-01-31 | 1996 | 1996-02-19 | 2016 | 2016-02-08 | 2036 | 2036-01-28 |
| 1977 | 1977-02-18 | 1997 | 1997-02-07 | 2017 | 2017-01-28 | | |
| 1978 | 1978-02-07 | 1998 | 1998-01-28 | 2018 | 2018-02-16 | | |

表自洽檢查（實作與審查皆須成立）：每年春節落在 01-21 至 02-20 之間；相鄰兩列間隔為 353、354、355、383、384 或 385 天；任一列的生肖年結束日 = 次列春節前一日。

結果 `{ok:true,result}` 的 result 固定含下列欄位（無 asOfDate 時最後四欄為 null）：

- `zodiacYear`：生肖年（整數，即生肖年開始的國曆年，如 2024）。
- `animalIndex`（0–11）、`animalZh`、`animalEn`、`branchZh`（地支一字）。
- `stemZh`（天干一字）、`elementZh`、`elementEn`、`ganzhiZh`（干支二字）。
- `spanStart`、`spanEnd`：`YYYY-MM-DD`，該生肖年第一天（春節日）與最後一天（次年春節前一日）。
- `cnyOfBirthYear`：出生年（Yb）的春節日 `YYYY-MM-DD`，供介面解釋交界。
- `beforeCny`：布林，出生日期是否在出生年春節之前（true 表示生肖屬前一年）。
- `asOfZodiacYear`：asOfDate 的生肖年或 null。
- `isBenMingNian`：asOfDate 是否落在與出生相同生肖的生肖年內，或 null。
- `nextBenMingNianYear`：下一個本命生肖年（整數）或 null。
- `nextBenMingNianStart`：該生肖年的春節日；該年 > 2036 時為 null。

介面呈現：摘要行固定格式「生肖：龍（Dragon）· 甲辰年」/ "Sign: Dragon · Jia-Chen year"（干支拼音不進核心結果，只在英文化妝層對應 stem/branch 固定對照：甲 Jia、乙 Yi、丙 Bing、丁 Ding、戊 Wu、己 Ji、庚 Geng、辛 Xin、壬 Ren、癸 Gui；子 Zi、丑 Chou、寅 Yin、卯 Mao、辰 Chen、巳 Si、午 Wu、未 Wei、申 Shen、酉 You、戌 Xu、亥 Hai）。beforeCny 為 true 時顯示「出生在春節之前，屬前一年生肖 / Born before Chinese New Year — the previous year's sign applies.」。機器值不隨 locale 改；日期一律 `YYYY-MM-DD`。

固定下載 `chinese-zodiac-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/chinese-zodiac-calculator/`。src/core.mjs 放純驗證、推導、格式化（春節表為核心內的固定資料常數，逐列與本文表格一致）；src/controller.mjs 管草稿、工作世代及資源；src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 日期運算固定用整數（年、月、日）與日序換算，不用 `Date` 物件解讀使用者字串，不涉時區與時刻；閏年判定與每月日數由核心自有表與規則決定。mod 運算一律取正餘數。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢生肖」，畫面和完整報告符合核心 fixtures（含春節前／春節當天／本命年案例），使用者取得對應產物。 |
| boundaries | 合法端點（1960-01-01、2035-12-31、asOfDate 2036-12-31）、剛好越界、第一個錯誤、春節表自洽（間隔與範圍）檢查的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含十二生肖與干支對照）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected；春節表與每個生肖／干支預期由作者依公開曆表與公式錨手算（複核紀錄見 AUTHOR-CHECK.md）。

| 案例 ID | 驗證行為 |
| --- | --- |
| `pre-cny-2025` | 春節前出生屬前一年（2025-01-15 → 2024 甲辰龍年），beforeCny=true |
| `cny-day-2025` | 春節當天出生屬新生肖年（2025-01-29 → 乙巳蛇年） |
| `sixties-rat` | 1960 年代中段（1960-06-15 → 庚子鼠年） |
| `jan-1960-prev-year` | 範圍下限附近：1960-01-10 → 1959 己亥豬年（用到 1959 邊界列） |
| `benmingnian-2024` | 本命年：2000 龍年生、asOf 2024 → isBenMingNian=true，下一個 2036 |
| `next-benming-upcoming` | 非本命年：1990 馬年生、asOf 2025 → false，下一個 2026 及表內開始日 |
| `day-before-cny-1984` | 春節前一日（1984-02-01 → 1983 癸亥豬年） |
| `last-day-2035` | 範圍上限端點（2035-12-31 → 乙卯兔年，spanEnd 用到 2036 邊界列） |
| `out-of-range-low` | 1959-12-31 → OUT_OF_RANGE（field=birthDate） |
| `out-of-range-high` | 2036-01-01 → OUT_OF_RANGE（field=birthDate） |
| `date-invalid` | 2025-02-29 → DATE_INVALID |
| `date-format` | 2025/01/15 → DATE_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

（核心案例 12 筆：上表前 12 列；`date-invalid`、`date-format` 與兩筆 OUT_OF_RANGE 合計 4 筆錯誤案例。）

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證春節表全表：每列落在 01-21–02-20、相鄰間隔 ∈ {353,354,355,383,384,385} 天、公式錨 (Z−4) mod 12 與 (Z−4) mod 10 對表內每一年的公開生肖／干支稱呼一致（如 1960 庚子鼠、1984 甲子鼠、2024 甲辰龍、2035 乙卯兔、2036 丙辰龍）。驗證 2 月 29 日在閏年（如 2024-02-29）為合法出生日期且屬龍年。

候選 gate（均 NOT_RUN）

- 於 `tools/chinese-zodiac-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「農曆生肖查詢」，title「農曆生肖查詢｜Gloss Tools」，description「輸入國曆出生日期，以農曆春節為交界查正確生肖、干支與生肖年起訖，並判讀本命年；附 1960–2035 年春節日期表。」。英文 lang=en，H1 “Chinese Zodiac Calculator”，title “Chinese Zodiac Calculator | Gloss Tools”，description “Find your Chinese zodiac sign from a Gregorian birth date using the Chinese New Year boundary, with the zodiac year's start and end dates and your Ben Ming Nian.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼 1 月出生會是前一年的生肖？生肖年從農曆正月初一開始，不是國曆 1 月 1 日；春節前出生屬前一年。 / Why can a January birthday belong to the previous sign? The zodiac year starts at Chinese New Year, not on January 1; births before it take the previous year's sign.
- FAQ。什麼是本命年？查詢日期落在與出生相同生肖的生肖年，就是本命年，每 12 年一次。 / What is Ben Ming Nian? When the as-of date falls in a zodiac year with the same sign as your birth year — once every 12 years.
- FAQ。和八字的生肖為什麼可能不同？八字以立春交界，本工具以春節交界；出生在兩者之間日期時結果可能不同。 / Why might BaZi give a different sign? BaZi switches at Li Chun; this tool switches at Chinese New Year, so births between the two can differ.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://chinese-zodiac-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格 task id `labs-chinese-zodiac-calculator-spec-20261109`（由主代理登記，作者不自行執行 registry 指令）。

非作者 reviewer 核對同一固定文件候選的八節及字面案例（特別是春節表逐列與公式錨交叉驗證），保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/chinese-zodiac-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
