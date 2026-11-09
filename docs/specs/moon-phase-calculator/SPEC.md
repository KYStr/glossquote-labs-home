# 月相計算機 / Moon Phase Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-moon-phase-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者輸入一個西元日期，先確認當天（UTC 正午）的月齡、照亮比與月相名稱，再查出下一個朔與下一個滿月各落在哪一天，安排觀月、拍攝、露營或單純好奇今晚月亮的形狀。

- 桌面。桌面輸入日期與自己所在地的 UTC 偏移，逐步核對月相、下一個朔／滿月的 UTC 日期與當地日期。
- 行動。手機在晚間散步或外拍現場查今晚月相與下一個滿月日期，不連線、不查外部曆表。

使用情境為日常天文常識查詢。資料只保留在目前頁面草稿。

## scope

固定朔望月（synodic）模型的日期級計算。評估時刻固定為輸入日期的 12:00 UTC；結果為該日期的代表值，不做逐時計算。非目標為逐時月相、月出月沒時刻、月食／日食預測、農曆（陰曆）換算、潮汐、月球距離／視直徑、真實曆表精度、把結果當天文台或農民曆的正式曆表。

已與本批盤點的 101 份既有預案目錄、`tools/` 與 registry 比對，無既有月相／月球工具。最相近者的實質差異如下。

- 同批補庫的日出日落計算機（sunrise-sunset-calculator）：對象是太陽，以 NOAA 分數年、均時差與赤緯、時角幾何算日出日落；此處對象是月球，以固定朔望月與參考朔 JD 的月齡模型分段命名。不同天體、不同模型、不同輸出。
- 睡眠週期計算機（sleep-cycle-calculator）：以 90 分鐘睡眠週期往返推就寢／起床時刻，無天文模型。此處是天文週期推算。

判定規則由本文定義，無線上資料或外部服務依賴。模型常數為通用的已發布近似值（見 inputsOutputs），本文固定採用，不逐版本更新。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「日期 / Date」：西元日期，格式 YYYY-MM-DD。
- 欄位或說明「UTC 偏移 / UTC offset」：只影響下一個朔／滿月的「當地日期」顯示，不影響評估時刻與其他輸出；欄位旁固定說明此點。
- 「計算月相 / Calculate moon phase」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個案例 `reference-epoch` 的輸入，明示範例並等待手動執行。
- 結果先摘要（月相名、月齡、照亮比），再列下一個朔與下一個滿月的天數與日期。成功才顯示「下載報告 / Download report」。文字可手動選取。結果區固定顯示模型說明：「本工具以平均朔望月推算，實際朔望時刻可相差數小時；月相以所選日期 UTC 正午為準。/ This tool uses the average synodic month; actual new and full moon times can differ by several hours. The phase is evaluated at 12:00 UTC on the chosen date.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"date":"","utcOffset":"+08:00"}` 並聚焦日期欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `date`：字串，文法恰為 `YYYY-MM-DD`（ASCII 數字與 `-`，年 4 位、月日各 2 位），raw 最多 10 個 code units。必須是真實存在的格里曆日期（例如 2023-02-29 不存在），範圍 1900-01-01 至 2100-12-31（含端點）。
- `utcOffset`：字串，文法 `+HH:MM` 或 `-HH:MM`（ASCII），raw 最多 6 個 code units。總分鐘 = ±(HH×60+MM)，MM 限 {00,15,30,45}，總分鐘範圍 −720（−12:00）至 +840（+14:00）。預設 `"+08:00"`。

驗證順序固定。先整體 SCHEMA；再依 date、utcOffset 欄位順序逐欄：raw 超限 INPUT_LIMIT、不成對 surrogate UNICODE、空字串 EMPTY、文法不合（date 用 DATE_FORMAT、utcOffset 用 OFFSET_FORMAT）、date 非真實日期 INVALID_DATE、超出範圍 RANGE。field 為欄位名，row 一律 null。整份失敗回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（全部固定，雙精度浮點；mod 指數學正餘數，結果落在 [0, S)）。

固定常數。朔望月 S = 29.530588853 天。參考朔 JD_REF = 2451550.1（2000-01-06 的朔；此 JD 常數為通用演算法慣用的已發布值，以常數本身為準，不以換算出的時刻反推修正）。

1. 日期轉儒略日數（整數演算法，Fliegel & Van Flandern）。對年 Y、月 M、日 D：a = ⌊(14−M)/12⌋；y = Y + 4800 − a；m = M + 12a − 3；JDN = D + ⌊(153m+2)/5⌋ + 365y + ⌊y/4⌋ − ⌊y/100⌋ + ⌊y/400⌋ − 32045。評估 JD = JDN（即該日期 12:00 UTC）。`julianDay` 輸出此 JDN 整數。
2. 月齡 age = (JD − JD_REF) mod S，落在 [0, S)。epoch 之前的日期同樣以正餘數處理，不回傳負值。
3. 月相 index = ⌊((age + S/16) mod S) / (S/8)⌋ mod 8，即每段寬 S/8、以正規時刻為中心。邊界（天，10 位小數供人讀核對；判定以公式為準，邊界值歸入較高 index 的一段，新月段跨越 0 點）如下表。

| index | 月相（zh） | Phase (en) | age 區間（天） |
| --- | --- | --- | --- |
| 0 | 新月 | New Moon | [0, 1.8456618033) ∪ [27.6849270497, 29.530588853) |
| 1 | 眉月 | Waxing Crescent | [1.8456618033, 5.5369854099) |
| 2 | 上弦月 | First Quarter | [5.5369854099, 9.2283090166) |
| 3 | 盈凸月 | Waxing Gibbous | [9.2283090166, 12.9196326232) |
| 4 | 滿月 | Full Moon | [12.9196326232, 16.6109562298) |
| 5 | 虧凸月 | Waning Gibbous | [16.6109562298, 20.3022798364) |
| 6 | 下弦月 | Last Quarter | [20.3022798364, 23.9936034431) |
| 7 | 殘月 | Waning Crescent | [23.9936034431, 27.6849270497) |

4. 照亮比 illumination = (1 − cos(2π × age / S)) / 2 × 100（百分比）。
5. 距下一個朔 daysToNew = (S − age) mod S；距下一個滿月 daysToFull = (S/2 − age) mod S（滿月正規點 age = S/2）。事件時刻（JD）= JD + 對應天數。當 daysTo 為 0 時事件即評估時刻本身，日期即輸入日期。
6. 事件日期。UTC 日期：取 JDN′ = ⌊事件 JD + 0.5⌋，以下列整數演算法（Richards）轉格里曆：a = JDN′ + 32044；b = ⌊(4a+3)/146097⌋；c = a − ⌊146097b/4⌋；d = ⌊(4c+3)/1461⌋；e = c − ⌊1461d/4⌋；m = ⌊(5e+2)/153⌋；日 = e − ⌊(153m+2)/5⌋ + 1；月 = m + 3 − 12⌊m/10⌋；年 = 100b + d − 4800 + ⌊m/10⌋。格式 YYYY-MM-DD。當地日期：同一事件時刻先加 utcOffset 總分鐘/1440 天，再走同樣換算。輸出日期可落在輸入範圍之外（例如 2100-12-31 的下一個朔在 2101 年），不視為錯誤。

顯示捨入固定。ageDays、illuminationPercent、daysToNextNewMoon、daysToNextFullMoon 各自由未捨入值一次性 round half-up 至小數 1 位。月相判定與事件日期一律用未捨入值，不用顯示值反推。result 欄位：`julianDay`（整數）、`ageDays`、`phaseIndex`（0–7）、`phaseZh`、`phaseEn`、`illuminationPercent`、`daysToNextNewMoon`、`nextNewMoonDate`（UTC)、`nextNewMoonDateLocal`、`daysToNextFullMoon`、`nextFullMoonDate`（UTC)、`nextFullMoonDateLocal`。phaseZh/phaseEn 取上表字面值。機器值不隨 locale 改。

固定下載 `moon-phase-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/moon-phase-calculator/`。src/core.mjs 放純驗證、推導、格式化（JD 換算只用整數運算；age／照亮比／事件時刻用雙精度浮點與 cos）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。不使用 Date 物件做日期運算（避免本地時區污染）；日期與 JD 一律走本文整數演算法。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算月相」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（1900-01-01、2100-12-31）、剛好越界、第一個錯誤與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。17 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `reference-epoch` | 參考朔日當日：月齡 29.4、新月、照亮比 0.0、下一個朔即當日 |
| `day-after-epoch` | epoch 次日：月齡 0.9、仍新月段、照亮比 0.9 |
| `model-first-full` | 模型首個滿月 2000-01-21；下一個滿月當地日期與 UTC 差一天 |
| `offset-negative-local` | 負偏移只改當地日期，其餘輸出與 `model-first-full` 相同 |
| `pre-epoch-last-quarter` | epoch 之前日期：正餘數月齡、下弦月、下一個朔即 epoch 日 |
| `known-full-moon-2025` | 已知滿月 2025-11-05：模型同日給滿月、距下一個滿月 0.1 天 |
| `full-moon-2026` | 2026-11-24 滿月：距下一個滿月 0.0 天、日期即當日 |
| `not-full-2026-11-05` | 2026-11-05 非滿月：殘月、照亮比 19.1；校正 fixture 選日（見 AUTHOR-CHECK） |
| `first-quarter-2026` | 上弦月、照亮比 43.2 |
| `leap-day-2024` | 2024-02-29 為真實日期、虧凸月 |
| `range-min-1900` | 下限端點合法；事件當地日期與 UTC 差一天 |
| `range-max-2100` | 上限端點合法；下一個朔／滿月日期溢出至 2101 年不算錯誤 |
| `err-empty-date` | 空日期回 EMPTY |
| `err-date-format` | 斜線分隔回 DATE_FORMAT |
| `err-invalid-date` | 2023-02-29 回 INVALID_DATE |
| `err-date-range` | 1899-12-31 回 RANGE |
| `err-offset-range` | +08:10 分鐘非 15 的倍數回 RANGE（field=utcOffset） |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 1900-01-01／1899-12-31、2100-12-31／2101-01-01、2000-02-29 合法、1900-02-29 非真實日期（百年規則）、offset −12:00／+14:00 端點與 +14:15 越界、MM 非 15 倍數。所有 age 落在 [0, S)，事件日期由未捨入時刻推得。

候選 gate（均 NOT_RUN）

- 於 `tools/moon-phase-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「月相計算機」，title「月相計算機｜Gloss Tools」，description「輸入西元日期，查當天月齡、照亮比與月相名稱，以及下一個朔與滿月落在哪一天。」。英文 lang=en，H1 “Moon Phase Calculator”，title “Moon Phase Calculator | Gloss Tools”，description “Enter a date to see the Moon's age, illumination and phase name, plus the dates of the next new and full moons.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。月相以哪個時刻為準？所選日期的 UTC 正午；同一晚前半夜與後半夜可能跨段，日期級結果是代表值。 / Which moment is the phase for? Noon UTC on the chosen date; a single night can straddle a boundary, so the daily value is representative.
- FAQ。為什麼和農民曆的滿月差了一天？本工具以平均朔望月推算，實際朔望時刻可相差數小時，跨過午夜就差一天。 / Why can the full moon differ by a day from an almanac? The average synodic month is an approximation; actual times vary by hours and can fall on the other side of midnight.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://moon-phase-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格 task id `labs-moon-phase-calculator-spec-20261109`（由主代理登記）。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/moon-phase-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
