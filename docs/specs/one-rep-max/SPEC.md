# 最大肌力 1RM 計算機 / One-Rep Max Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-one-rep-max-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

重訓者做完一組次最大重量後，要決定下一個週期的課表重量。手上有剛完成的重量與次數，需要一個可直接裝上槓的 1RM 估計與各百分比對應重量，而不是自己按計算機湊公式。

- 健身房。用手機輸入剛做完的重量（公斤或磅）與次數，立刻看到估計 1RM 與百分比對照表，照表裝槓片。
- 桌面。排課表時核對不同次數的估計是否一致，並比較兩個公式的差距。

使用情境為訓練安排。資料只保留在目前頁面草稿。結果是公式估算，不是實際測量。

## scope

以單組重量與次數估算 1RM 的封閉模型：Epley 與 Brzycki 兩公式並列、取平均為主要結果，附固定百分比—重量—參考次數表。非目標為實際測試 1RM、記錄訓練歷史、產生週課表、依動作別調整公式、性別／年齡修正、RPE／RIR 換算、槓片組合計算（要裝哪幾片）。

已比對既有規格與工具，無任何既有的 1RM 或肌力估算工具；最相近者的實質差異如下。

- 以體重、腰圍等估算體脂或熱量需求。此處輸入是外加負荷的重量與次數，輸出是最大肌力估計。docs/specs/bmi-tdee-calculator/SPEC.md
- 以距離與時間算跑步配速。此處不涉時間，是重量—次數關係模型。docs/specs/running-pace-calculator/SPEC.md
- 以公斤體重倍率算每日攝取量，屬營養。此處倍率來自重量—次數公式，不是每公斤劑量。docs/specs/water-intake-calculator/SPEC.md

判定規則由本文定義。百分比—參考次數採健身界通用的 %1RM–次數關係表（源於 Baechle & Earle, *Essentials of Strength Training and Conditioning* 所載關係圖），其 95–50% 的值由本文固定於 inputsOutputs，實作不得另查或改動。無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「重量、單位 / Weight and unit」：重量數字輸入，單位為公斤（kg）／磅（lb）二選一，預設公斤。
- 欄位或說明「次數 / Reps」：完成次數 1–30。
- 「計算 1RM / Calculate 1RM」是主要操作。「載入範例 / Load example」填入 `{"weight":"100","reps":"5","unit":"kg"}`，明示範例並等待手動執行。
- 「估算 1RM / Estimated 1RM」先摘要再列細節：主要結果為兩公式平均（0.5 公斤階梯），其下並列「Epley 公式 / Epley formula」與「Brzycki 公式 / Brzycki formula」各自的估計（小數一位），再來是「百分比對照表 / Percentage table」真實表格，欄位依序為「百分比 / % of 1RM」、「重量（公斤）/ Load (kg)」、「參考次數 / Typical reps」。所有輸出重量皆為公斤，不隨輸入單位改變。文字可手動選取。沒有下載或匯出。
- 結果區常駐一行聲明「1RM 是以公式估算，不是實際測試結果；嘗試最大重量時請使用護槓並請人補手。/ A 1RM here is a formula estimate, not a tested result; use safeties and a spotter for maximal attempts.」。當次數大於 10，結果另顯示「注意：次數超過 10 次時，公式估算的誤差會明顯變大，這個結果僅供參考。/ Note: beyond 10 reps, formula estimates lose accuracy — treat this result as a rough guide only.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入或單位改變，立即撤銷舊結果。顯示「輸入已變更，請重新計算 / Input changed. Calculate again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。若 highReps 為真，顯示高次數注意文字。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新計算 / Cancelled. You can calculate again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"weight":"","reps":"","unit":"kg"}` 並聚焦重量欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `weight`：ASCII 十進數字串，文法 `^(0|[1-9][0-9]{0,6})(\.[0-9]{1,2})?$`。整數部無前導零（0 本身除外），最多 7 位；小數部 1–2 位。數值範圍 0 < w ≤ 1500，單位為所選單位。預設空字串。
- `reps`：ASCII 整數字串，文法 `^(0|[1-9][0-9]*)$`，無前導零、無符號／小數。範圍 1–30。預設空字串。
- `unit`：`"kg"` 或 `"lb"`。預設 `"kg"`。磅只是輸入單位；所有輸出皆公斤。

驗證順序固定。先整體 SCHEMA。再逐欄依 weight、reps、unit 之序，每欄依序檢查：raw 長度超過 16 個 UTF-16 code units 為 INPUT_LIMIT；含不成對 surrogate 為 UNICODE；空字串為 EMPTY；文法不合（weight 為 DECIMAL_FORMAT、reps 為 INTEGER_FORMAT）；unit 不在集合內為 ENUM；範圍不合為 RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名，row 恆 null。成功僅為 `{ok:true,result}`。資源失敗用固定 INTERNAL，不回傳堆疊。沒有隱含轉型：不修剪空白（空白使文法失敗）、不接受全形數字、不猜單位。

計算以精確有理數進行，中間值不捨入、不經二進位浮點。重量先化為所選單位的百分之一整數 W（文法保證最多兩位小數）；公斤值 wKg：unit=kg 時 W/100；unit=lb 時 W×45359237/10^10（1 lb = 0.45359237 kg，精確定義值）。

1. reps=1 時，兩估計皆定義為 wKg 本身（能完成 1 次的重量即其 1RM；Epley 在 r=1 的原始式 w×31/30 不採用）。
2. reps≥2 時，Epley 原始值 e = wKg×(30+r)/30；Brzycki 原始值 b = wKg×36/(37−r)。
3. 捨入只有三個固定點，皆四捨五入（恰平局向上，正值域）。`epleyKg` = e 捨入至小數一位；`brzyckiKg` = b 捨入至小數一位；`oneRepMaxKg` = (e+b)/2 捨入至最近的 0.5 公斤階梯。此三值是結果中僅有的小數一位／0.5 階梯輸出，UI 一律顯示一位小數（如 100.0、97.5）。
4. 百分比表以**已捨入的** `oneRepMaxKg` 為基準：每列 loadKg = oneRepMaxKg×percent/100 再捨入至最近的 0.5 階梯（平局向上）。percent 與 typicalReps 為下表固定整數，順序固定由 95 遞減至 50。

| percent | typicalReps |
| --- | --- |
| 95 | 2 |
| 90 | 4 |
| 85 | 6 |
| 80 | 8 |
| 75 | 10 |
| 70 | 12 |
| 65 | 16 |
| 60 | 20 |
| 55 | 24 |
| 50 | 30 |

5. 結果 `{epleyKg,brzyckiKg,oneRepMaxKg,highReps,rows}`。highReps 為布林，reps>10 時 true（reps=10 為 false：兩公式在 r=10 倍率同為 4/3 而交會）。rows 為 10 列 `{percent,loadKg,typicalReps}`。typicalReps 是固定對照表的參考值，不是承諾做到的次數。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/one-rep-max/`。`public/js/core/` 放純驗證、精確有理數推導與格式化（BigInt 比例運算，不接觸 DOM／網路／storage，測試可直接 import）；`public/js/app.js` 管草稿、執行世代與 DOM 綁定；`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。`scripts/` 只做可重現 preview 建置、靜態檢查與 loopback serve，不取線上檔、不發布。

- 計算是 O(1)，不使用 Worker、不假造進度。按下計算時先使舊結果失效並遞增世代號，將快照排入下一個事件迴圈工作（setTimeout 0）執行核心；完成時僅當世代仍為目前世代且狀態為 busy 才套用結果，否則丟棄（晚到／過期 settle 不復活舊結果）。取消使待執行世代失效並回 cancelled。編輯、重設、切換語言頁或 pagehide 時同樣使世代失效。bfcache 回來重設。
- 表格與結果用 textContent/value，欄位值不當標記、style、selector、href、src。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算 1RM」，畫面的主要結果、兩公式值與百分比表符合核心 fixtures。 |
| boundaries | 合法端點（reps 1 與 30、重量上限）、剛好越界、第一個錯誤與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限與世代失效（取消／編輯後舊結果不復活）。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改可操作；公斤與磅輸入各走一遍。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、取消與 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。11 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `single-rep` | 次數 1 時 1RM 等於重量，附完整百分比表 |
| `mid-rep-divergence` | 兩公式明顯不同；50% 列 0.5 階梯平局向上取 |
| `formula-crossover` | 次數 10 兩公式交會相等，且不觸發高次數提醒 |
| `high-reps-warning` | 次數 20 觸發 highReps |
| `pounds-input` | 磅以 0.45359237 精確換算，輸出公斤 |
| `max-reps` | 次數上限 30；50% 列平局向上取 |
| `fractional-weight` | 小數重量；50% 列平局向上取 |
| `error-reps-range` | 次數 31 回 RANGE／reps |
| `error-weight-format` | 重量非數字回 DECIMAL_FORMAT／weight，且先於其他欄 |
| `error-weight-zero` | 重量 0 回 RANGE／weight |
| `error-unit-enum` | 單位不在集合回 ENUM／unit |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 待執行時取消，晚到結果不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時機的假排程器。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在完成前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可用性。

另測合法上限（重量 1500、次數 1 與 30）、剛好超限（重量 1500.01、次數 0 與 31）、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 reps=1 時兩估計恰等於換算後重量、r=10 兩估計相等、百分比表每列 loadKg 皆為 0.5 的倍數且以已捨入的主要結果為基準、磅換算不先捨入（225 lb 的 wKg = 102.05828325 精確值）。

候選 gate（均 NOT_RUN）

- 於 `tools/one-rep-max/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「最大肌力 1RM 計算機」，title「最大肌力 1RM 計算機｜Gloss Tools」，description「輸入你能完成的重量與次數，用 Epley 與 Brzycki 兩個公式估算最大肌力（1RM），並列出各百分比對應的訓練重量。」。英文 lang=en，H1 “One-Rep Max Calculator”，title “One-Rep Max Calculator | Gloss Tools”，description “Estimate your one-rep max from a weight and rep count with the Epley and Brzycki formulas, and see training loads for each percentage of your 1RM.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 錯誤訊息固定對譯。EMPTY（weight）「請輸入重量 / Enter the weight.」；DECIMAL_FORMAT「重量必須是數字，最多兩位小數 / Weight must be a number with at most two decimal places.」；RANGE（weight）「重量必須大於 0 且不超過 1500 / Weight must be greater than 0 and at most 1500.」；EMPTY（reps）「請輸入次數 / Enter the reps.」；INTEGER_FORMAT「次數必須是整數 / Reps must be a whole number.」；RANGE（reps）「次數必須介於 1 到 30 / Reps must be between 1 and 30.」；ENUM「單位只能是公斤或磅 / Unit must be kilograms or pounds.」；INPUT_LIMIT「輸入太長 / Input is too long.」；UNICODE「輸入含無效字元 / Input contains an invalid character.」；SCHEMA「輸入格式不正確 / The input is malformed.」；INTERNAL「發生錯誤，請再試一次 / Something went wrong. Try again.」。
- FAQ。兩個公式為什麼不同？兩者用不同的次數—重量關係模型，本工具兩個都列出，並以平均值作為主要結果。 / Why do the two formulas differ? They model the reps-to-weight relationship differently; this tool shows both and uses their average as the headline result.
- FAQ。次數填越多越準嗎？不是。超過約 10 次後估算誤差明顯變大。 / Are more reps more accurate? No. Past about 10 reps the estimates lose accuracy noticeably.
- FAQ。為什麼重量以 0.5 公斤為單位？健身房槓片通常以 0.5 公斤為最小調整單位，結果直接對應可裝的重量。 / Why are loads in 0.5 kg steps? Gym plates adjust in 0.5 kg steps, so results match loads you can actually set.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://one-rep-max.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格任務 id `labs-one-rep-max-spec-20261109`（由主代理登記）。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/one-rep-max/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
