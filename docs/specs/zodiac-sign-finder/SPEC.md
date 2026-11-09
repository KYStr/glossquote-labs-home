# 西洋星座查詢 / Zodiac Sign Finder

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-zodiac-sign-finder-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者手上只有出生月日（人事表、通訊錄、朋友口述都常缺年份），想立刻知道對應的西洋星座、屬性，以及生日是否正落在交界日。

- 桌面。行政人員整理生日賀卡名單，逐筆輸入月、日查星座，交界日要另外標出來避免寫錯。
- 行動。手機在聊天中被問「12 月 25 日是什麼星座」，只輸月、日就得到答案，不必先找年份。

使用情境為日常查詢。資料只保留在目前頁面草稿。

## scope

MVP：以本文固定的熱帶黃道（tropical zodiac）十二星座日期表，用出生月、日查詢星座代碼、符號、日期範圍、元素、模式；命中星座首日或末日時附交界提示與相鄰星座。出生年選填，只用來驗證該日期在該年是否存在（影響 2 月 29 日），永遠不改變星座結果。

非目標：占星命盤與上升星座、出生時間或出生地換算、恆星黃道（sidereal）體系、農曆生日換算、中國生肖、每日運勢或性格分析、由年份推算年齡、依年份微調交界時刻（交界一律用固定日期表，見 inputsOutputs）。

已比對本 repo 預案庫存（`docs/specs/` 全部目錄與 registry），無既有西洋星座或占星查詢工具，本案不與任何既有工具重複。最接近者僅同為日期輸入的 `pregnancy-due-date-calculator`（預產期推算），輸入輸出與用途完全不同。

判定規則由本文定義，無線上資料或外部服務依賴。日期表為通行熱帶黃道慣用表，版本即本文 v1 的固定表，不隨實作或年份變動。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「出生月、出生日 / Birth month and birth day」
- 欄位或說明「出生年（選填） / Birth year (optional)」及固定輔助文字「年份選填，只用來檢查日期是否存在，不影響星座。 / The year is optional. It only checks that the date exists and never changes the sign.」
- 「查詢星座 / Find your sign」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果先顯示符號與星座名（中英並列）、所屬日期範圍（「M 月 D 日 – M 月 D 日」／「Mon D – Mon D」，月份英文縮寫 Jan–Dec），再顯示「元素 · 模式」（如「土象 · 基本 / Earth · Cardinal」）。`cusp` 為 true 時在結果內加一行交界提示：固定文案「接近交界，依出生年與時間可能不同」／「Near a cusp — the sign can differ by birth year and time」，並以「相鄰星座：X」／「Neighbouring sign: X」標出 `cuspNeighbor` 的星座名。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"month":"","day":"","year":""}` 並聚焦月份欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- 欄位恰為 `month`、`day`、`year` 三個字串。文法皆為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 8 單元（UTF-16 code units）。`month`、`day` 必填（空字串為缺內容）；`year` 選填，空字串代表未提供。
- 範圍：month 1–12，day 1–31，year 1–9999。預設三欄皆空字串。

驗證順序固定如下。先整體 SCHEMA，再逐欄（欄序 month → day → year；每欄依序 INPUT_LIMIT、UNICODE、EMPTY、INTEGER_FORMAT、RANGE，其中 `year` 跳過 EMPTY），最後跨欄日期存在檢查。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null；field 對應 JSON Pointer 為 `/month`、`/day`、`/year`，SCHEMA 時 field=null（路徑為根）。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 逐欄驗證。raw 超過 8 單元 INPUT_LIMIT；不成對 surrogate UNICODE；month/day 為空字串 EMPTY；文法不合 INTEGER_FORMAT；數值超範圍 RANGE。
2. 跨欄日期存在。每月日數固定：一、三、五、七、八、十、十二月 31 日；四、六、九、十一月 30 日；二月在 year 未提供或 year 為閏年時 29 日、其餘 28 日。閏年規則為格里曆：`(y % 400 == 0) || (y % 4 == 0 && y % 100 != 0)`。day 超過該月日數 → DATE_INVALID，field=`day`。因此 2 月 29 日：未填年份視為有效、填閏年有效、填非閏年 DATE_INVALID；2 月 30 日起恒 DATE_INVALID。
3. 查表。令 `md = month * 100 + day`。下表為固定資料（順序即星座循環序，牡羊起、雙魚終，循環回牡羊）：

| sign | 符號 | 中文 | English | 起（月/日） | 迄（月/日） | element | modality |
| --- | --- | --- | --- | --- | --- | --- | --- |
| aries | ♈ | 牡羊座 | Aries | 3/21 | 4/19 | fire | cardinal |
| taurus | ♉ | 金牛座 | Taurus | 4/20 | 5/20 | earth | fixed |
| gemini | ♊ | 雙子座 | Gemini | 5/21 | 6/20 | air | mutable |
| cancer | ♋ | 巨蟹座 | Cancer | 6/21 | 7/22 | water | cardinal |
| leo | ♌ | 獅子座 | Leo | 7/23 | 8/22 | fire | fixed |
| virgo | ♍ | 處女座 | Virgo | 8/23 | 9/22 | earth | mutable |
| libra | ♎ | 天秤座 | Libra | 9/23 | 10/22 | air | cardinal |
| scorpio | ♏ | 天蠍座 | Scorpio | 10/23 | 11/21 | water | fixed |
| sagittarius | ♐ | 射手座 | Sagittarius | 11/22 | 12/21 | fire | mutable |
| capricorn | ♑ | 摩羯座 | Capricorn | 12/22 | 1/19 | earth | cardinal |
| aquarius | ♒ | 水瓶座 | Aquarius | 1/20 | 2/18 | air | fixed |
| pisces | ♓ | 雙魚座 | Pisces | 2/19 | 3/20 | water | mutable |

命中規則：非 capricorn 列以 `startMd <= md && md <= endMd` 判定；capricorn 跨年，以 `md >= 1222 || md <= 119` 判定。十二列恰覆蓋全部合法（月，日）且互不重疊，每個合法輸入恰命中一列。元素與模式的顯示字串固定：fire=火象／Fire，earth=土象／Earth，air=風象／Air，water=水象／Water；cardinal=基本／Cardinal，fixed=固定／Fixed，mutable=變動／Mutable。2 月 29 日的 md=229，落在 pisces（219–320），結果恒為 pisces。

4. 交界判定。`md` 等於命中列的 startMd 或 endMd 時 `cusp=true`，否則 false。`cuspNeighbor`：等於 startMd 時為循環序的前一列 sign、等於 endMd 時為循環序的次一列 sign、其餘為 null。交界只標示，不改變命中結果；日期表本身不依年份或出生時間變動。
5. 結果 `{sign,symbol,element,modality,rangeStart,rangeEnd,cusp,cuspNeighbor}`，其中 rangeStart/rangeEnd 為命中列的 `{month,day}` 整數回顯。成功僅為 `{ok:true,result}`。機器值不隨 locale 改，不使用 `Date` 或時區換算。

固定下載 `zodiac-sign-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/zodiac-sign-finder/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心查表只用整數：十二列以常數資料保存（sign、symbol、startMd、endMd、element、modality），命中與交界判定皆為整數比較；驗證順序、閏年規則與每月日數表照 inputsOutputs，不用 `Date` 物件推導，避免時區與曆法漂移。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢星座」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（1/19、1/20、12/22、2/29 三種年份情況、4/31）、剛好越界、第一個錯誤、欄位路徑和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `capricorn-dec-wrap` | 跨年星座的 12 月側命中 |
| `capricorn-jan-wrap` | 跨年星座的 1 月側命中 |
| `aries-first-day-cusp` | 首日交界，相鄰為前一星座 |
| `scorpio-last-day-cusp` | 末日交界，相鄰為次一星座 |
| `aquarius-first-day-cusp` | 填年份不影響結果；首日交界 |
| `leo-mid-sign` | 一般中段日期 |
| `feb29-no-year` | 未填年份的 2 月 29 日有效，屬雙魚座 |
| `feb29-leap-year` | 閏年 2 月 29 日有效 |
| `feb29-nonleap-year` | 非閏年 2 月 29 日 DATE_INVALID |
| `april-31` | 小月 31 日 DATE_INVALID |
| `month-out-of-range` | 月份 RANGE，欄序優先 |
| `month-empty` | 必填欄 EMPTY |
| `day-decimal-format` | 小數文法 INTEGER_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證十二列邊界全點（每列 startMd/endMd 與其前後一日）、2 月 29 日三年份情境、1900/2000/2100 的閏年規則（1900 非閏、2000 閏、2100 非閏）、year 上限 9999/10000、month/day 兩位與三位文法。所有合法（月，日）恰命中一列。

候選 gate（均 NOT_RUN）

- 於 `tools/zodiac-sign-finder/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「西洋星座查詢」，title「西洋星座查詢｜Gloss Tools」，description「輸入出生月日，依固定的熱帶黃道日期表查出西洋星座、符號、元素與模式；交界首末日附提示，年份選填只驗證日期存在、不影響結果。」英文 lang=en，H1 “Zodiac Sign Finder”，title “Zodiac Sign Finder | Gloss Tools”，description “Enter a birth month and day to look up the Western zodiac sign, symbol, element and modality in a fixed tropical date table. Cusp days are flagged, and the optional year only validates that the date exists — it never changes the sign.” 兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。2 月 29 日出生是什麼星座？雙魚座。年份只用來檢查日期是否存在；不填年份時 2 月 29 日也視為有效。 / Born on Feb 29? Pisces. The year only checks that the date exists; with no year given, Feb 29 is accepted.
- FAQ。為什麼交界日有特別提示？實際交界時刻隨年份略有不同，本工具使用固定日期表，並在每個星座的首日與末日附上提示。 / Why the cusp note? The exact ingress moment varies slightly by year; this tool uses a fixed date table and flags each sign's first and last day.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://zodiac-sign-finder.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 id 為 `labs-zodiac-sign-finder-spec-20261109`（由主代理登記，作者未執行 registry 指令）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/zodiac-sign-finder/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
