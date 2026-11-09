# 咖啡因代謝計算機 / Caffeine Half-Life Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-caffeine-half-life-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

想知道今天喝下的咖啡因到就寢時還剩多少，先以單一半衰期的指數衰減模型，把每杯的攝取時間與毫克加總成一條可核對的殘留曲線。

- 桌面。下午在辦公桌前列出今天每一杯的時間與種類，確認查詢時間與就寢時的殘留量再決定要不要再喝。
- 行動。手機在咖啡店排隊時快速核對：如果現在再喝一杯，晚上上床時會剩多少。

使用情境為日常估算。資料只保留在目前頁面草稿。

## scope

單日時間模型、分鐘精度、每筆自攝取時刻起以同一半衰期指數衰減並加總。非目標為吸收延遲或雙室代謝模型、多日追蹤、睡眠品質預測、醫療建議、紀錄保存、分享或匯出。

已比對基線 commit `1ecd5c4babd6aa2877add049fa5281370f534ac9` 的 `docs/specs/`、`tools/`、`sources/candidates/`、`sources/legacy/`：沒有任何咖啡因相關工具。最相近者的實質差異如下。

- 由就寢／起床時間反推 90 分鐘睡眠週期。此處是已攝取咖啡因的衰減殘留，輸入是攝取紀錄與半衰期，輸出是殘留毫克曲線。 [sleep-cycle-calculator](../sleep-cycle-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。飲品預設毫克為下文固定表（數值與 USDA FoodData Central 常見值一致），不即時查詢。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「攝取紀錄（時間、飲品預設或自訂毫克）/ Intake entries (time, drink preset or custom mg)」：1–8 列，可新增／刪除列；刪到剩 1 列時刪除鈕停用，滿 8 列時新增鈕停用。每列三個欄位：時間（文字輸入 HH:MM）、飲品預設（下拉，可選「自訂毫克」即 preset 為 null）、毫克（preset 非自訂時停用並顯示表格值）。
- 欄位或說明「半衰期（小時）/ Half-life (hours)」：預設 `5`，可填 3–8（一位小數）。
- 欄位或說明「查詢時間、就寢時間（選填）/ Query time, bedtime (optional)」。
- 「計算殘留量 / Calculate remaining caffeine」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「查詢時間的殘留量 / Remaining at the query time」先顯示總量摘要，再列逐筆明細（時間、毫克、已過分鐘、殘留）、之後 6 小時數列與就寢讀數。結果區固定顯示說明「半衰期因人而異（約 3–8 小時），本工具以你設定的半衰期估算，數值僅供參考，不是醫療建議。 / Half-life varies by person (roughly 3–8 hours). This tool estimates with the half-life you set; values are for reference only and are not medical advice.」。查詢時間早於某筆攝取時，該筆標示「尚未攝取（在查詢時間之後）/ Not yet consumed (after the query time)」。數列或就寢時刻跨午夜時標示「（隔日）/ (next day)」。文字可手動選取。本工具沒有下載或匯出。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項或範例改變，立即撤銷舊結果。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。編輯終止舊工作並回 dirty。 |
| success | 結果對應目前快照。全部尚未攝取時總量為 0.0 並附說明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"entries":[{"time":"","preset":null,"mg":""}],"halfLifeHours":"5","queryTime":"","bedtime":""}` 並聚焦首個時間欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數為普通物件，只讀 own data，且只含下列確切欄位。未知、缺欄、錯型別、accessor 皆 SCHEMA。JSON fixture 即介面。文字欄以 DOM 的 LF 值為準。

固定飲品預設表（preset id、雙語標籤、咖啡因毫克）：

| id | 標籤 | mg |
| --- | --- | --- |
| `espresso` | 義式濃縮（30 ml）/ Espresso (30 ml) | 63 |
| `brewed-coffee` | 濾泡咖啡（240 ml）/ Brewed coffee (240 ml) | 95 |
| `black-tea` | 紅茶（240 ml）/ Black tea (240 ml) | 47 |
| `green-tea` | 綠茶（240 ml）/ Green tea (240 ml) | 28 |
| `cola` | 可樂（355 ml）/ Cola (355 ml) | 34 |
| `energy-drink` | 能量飲料（250 ml）/ Energy drink (250 ml) | 80 |

- `entries`：陣列，1–8 筆。每筆為只含 `{time, preset, mg}` 的普通物件。
  - `time`：字串，恰為 `HH:MM`（兩位數字、冒號、兩位數字），HH 00–23、MM 00–59。換算分鐘 `timeMin = HH×60 + MM`，範圍 0–1439。
  - `preset`：`null` 或上表任一 id。非 null 時有效毫克為表格值，且 `mg` 必須為 `null`。
  - `mg`：`null` 或 ASCII 十進整數字串（0 或非零開頭，無空白／符號／小數／指數），值 1–1000。僅 `preset` 為 null 時使用。
- `halfLifeHours`：字串，文法 `^(0|[1-9][0-9]?)(\.[0-9])?$`（整數或恰一位小數），值 3.0–8.0。預設 `"5"`。半衰期分鐘 `halfLifeMin = 值 × 60`，必為整數（一位小數 ×60 為 6 的倍數）：`"5"`→300、`"5.5"`→330、`"3"`→180、`"8"`→480。
- `queryTime`：字串，同 `time` 文法，必填。
- `bedtime`：字串，`""` 表示未提供，或同 `time` 文法。

每個原始字串最多 8 個 code units。每個字串先容量（INPUT_LIMIT）、再未配對 surrogate（UNICODE）、再文法。整份驗證順序固定如下，第一個失敗即回傳 `{ok:false,error:{code,field,row}}`；`field` 為頂層欄位名或 null，`row` 為 1-based 筆號（僅 entries 內錯誤）或 null。成功僅為 `{ok:true,result}`。資源或內部失敗用固定 INTERNAL，不回傳堆疊。

1. 整體形狀：非普通物件、未知／缺頂層欄、容器錯型別為 SCHEMA（可辨識時 field 為該欄名）。`entries` 非陣列為 SCHEMA，field `entries`。
2. `entries` 長度：0 為 EMPTY（field `entries`，row null）；大於 8 為 ROW_LIMIT（field `entries`，row null）。
3. 逐筆依輸入順序（row 為筆號）：形狀錯誤 SCHEMA；`time` 空字串 EMPTY、文法或鐘點越界 TIME_FORMAT；`preset` 非 null 且不在表中 PRESET_UNKNOWN；`preset` 非 null 且 `mg` 非 null 為 CONFLICT；`preset` 為 null 時 `mg` 為 null 或空字串 EMPTY、文法 INTEGER_FORMAT、範圍 RANGE。以上 field 皆 `entries`。
4. `halfLifeHours`：空字串 EMPTY、文法 DECIMAL_FORMAT、範圍 RANGE，field `halfLifeHours`。
5. `queryTime`：空字串 EMPTY、文法或鐘點越界 TIME_FORMAT，field `queryTime`。
6. `bedtime`：非空時文法或鐘點越界 TIME_FORMAT，field `bedtime`。

衰減模型（單日時間語義，固定）：

- 評估時刻 X 為整數分鐘；查詢時刻 Q = `timeMin(queryTime)`。數列與就寢時刻可大於 1439（見下），鐘點顯示一律 `X mod 1440`。
- 第 i 筆在時刻 X 的貢獻：`elapsed = X − timeMin_i`；`elapsed < 0` 時貢獻 0（尚未攝取，不回捲到前一日）；否則 `mg_i × 2^(−elapsed / halfLifeMin)`，以 IEEE-754 雙精度（`Math.pow`）計算。攝取當下 elapsed=0 即全量，無吸收延遲。
- 查詢結果 `query`：`{timeMin: Q, totalMg, notYetCount, perEntry}`。`perEntry` 依輸入順序，每筆 `{row, timeMin, mg, elapsedMin, remainingMg}`；`mg` 為有效毫克整數；尚未攝取時 `elapsedMin` 為 null、`remainingMg` 為 `"0.0"`。`notYetCount` 為查詢時刻尚未攝取的筆數。
- 數列 `series`：恰 6 點，k=1..6，X = Q + 60k，每點 `{offsetMin: 60k, timeMin: X mod 1440, nextDay: X ≥ 1440, totalMg}`。
- 就寢 `atBedtime`：未提供時為 null。提供時 B = `timeMin(bedtime)`，就寢時刻 `instant = B ≥ Q ? B : B + 1440`（今晚語義；B 等於 Q 時 instant = B），輸出 `{timeMin: B, instantMin: instant, afterMidnight: instant ≥ 1440, minutesFromQuery: instant − Q, totalMg}`。
- 捨入：所有毫克輸出（`totalMg`、`remainingMg`）為字串，恰一位小數，以未捨入雙精度值 `r = Math.floor(x×10 + 0.5) / 10`（x ≥ 0）後格式化。總量由未捨入貢獻加總後捨入；逐筆各自獨立捨入，因此顯示總量可能與顯示逐筆之和差 0.1 mg，屬固定行為。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/caffeine-half-life/`。`public/js/core/*.mjs` 放純驗證、衰減模型與格式化，不接觸 DOM／網路／storage，測試直接 import。`public/js/app.js` 用安全 DOM API 綁表單與狀態。`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。`scripts/` 只做可重現 preview 建置（連跑兩次 bytes 相同）、靜態 check 與 loopback serve，不取線上檔、不發布。

- 計算本身同步且短，不使用 Worker、不假造進度。controller 在下一個事件迴圈工作項執行目前快照，使 busy／取消／晚到丟棄可實測：工作開始即遞增世代號並使舊結果失效；只有目前世代且 busy 的 settle 才採用，舊世代成功或錯誤一律丟棄。編輯、換來源、重設、取消或 pagehide 都終止待決工作；bfcache 回來重設。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src 'none'、script-src 'self'、style-src 'self'、img-src 'self'、connect-src 'none'、object-src 'none'、base-uri 'none'、form-action 'none'、frame-ancestors 'none'。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算殘留量」，畫面結果符合核心 fixtures（含逐筆、數列、就寢），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限和世代／Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、數列跨午夜顯示和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。9 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected；毫克 expected 由作者依本文公式以兩種獨立算法（`2^(−t/H)` 與 `exp(−ln2·t/H)`）重算並核對捨入邊界距離。

| 案例 ID | 驗證行為 |
| --- | --- |
| `exact-half-life` | 恰好一個半衰期，剩量為原量一半 |
| `two-entries` | 兩筆預設飲品加總、逐筆殘留與就寢讀數 |
| `query-before-intake` | 查詢早於攝取：貢獻 0、notYet 標示，數列在攝取後才起算 |
| `bedtime-after-midnight` | 就寢在午夜之後：instant 加 1440，數列跨午夜旗標 |
| `max-half-life` | 半衰期上限 8 小時，恰好一個半衰期 |
| `too-many-entries` | 9 筆超過列上限 |
| `bad-entry-time` | 筆內時間 24:00 不合法 |
| `preset-mg-conflict` | 同時給預設與自訂毫克 |
| `half-life-out-of-range` | 半衰期 9 超出 3–8 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假排程器。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可用性（本工具無下載，checkpoint 以 resultAvailable 表示結果快照是否顯示）。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證半衰期 3.0/8.0 與 2.9/8.1、mg 1/1000 與 0/1001、entries 8/9、elapsed 恰為 0、查詢與就寢同刻、數列跨午夜。所有已接受結果的逐筆與總量一致到捨入規則所述的 0.1 mg 容差。

候選 gate（均 NOT_RUN）

- 於 `tools/caffeine-half-life/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「咖啡因代謝計算機」，title「咖啡因代謝計算機｜Gloss Tools」，description「輸入今天喝下的咖啡、茶或能量飲料的時間與咖啡因量，用你設定的半衰期估算查詢時間與就寢時體內還剩多少咖啡因。」。英文 lang=en，H1 “Caffeine Half-Life Calculator”，title “Caffeine Half-Life Calculator | Gloss Tools”，description “Enter when you had each coffee, tea or energy drink and estimate how much caffeine remains at a query time and at bedtime, using a half-life you choose.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。查詢時間比某杯的時間早，怎麼算？在那杯之前它不計入；之後的小時數列會在它的時間過後開始計入。 / What if the query time is earlier than a drink? It contributes nothing before its intake time; the hourly series starts counting it once its time passes.
- FAQ。這能告訴我今晚睡得好不好嗎？不能。這只是用單一半衰期做的衰減估算，個人代謝差異很大。 / Can this predict my sleep? No. It is a decay estimate with a single half-life; individual metabolism varies widely.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://caffeine-half-life.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 id 為 `labs-caffeine-half-life-spec-20261109`，由主代理登記（作者不執行 registry 指令）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/caffeine-half-life/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
