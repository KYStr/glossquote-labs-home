# 樂透選號器 / Lottery Number Picker

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-lottery-number-picker-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

買彩券的人想自己選號，但不用投注機的電腦快選：快選結果無法重現，下週想沿用同一組、或對獎時想核對「當初到底產了哪幾組」都叫不回來。本工具讓使用者以一個自己記得住的種子（生日、幸運數字）產生號碼——同一個種子、遊戲、組數與排除清單，永遠產生逐位相同的結果；並可排除不想用的號碼（例如全家人的生日號碼），一次產生 1–10 組升序號碼抄上投注單。

- 桌面。在家先產好幾組，複製或下載文字檔後再去投注站。
- 行動。手機在超商排隊時臨時產一組，畫面直接照抄，不啟動任何購買流程。

使用情境為選號輔助。資料只保留在目前頁面草稿。結果旁固定顯示誠實說明：每種號碼組合出現的機率完全相等，本工具不能預測開獎結果。

## scope

三種台灣彩券遊戲的固定選號規則、固定種子決定性產生、第一區排除清單、1–10 組。非目標為開獎結果查詢、對獎、號碼出現頻率統計、熱門／冷門號碼分析、任何預測或「提高中獎率」的宣稱或暗示、購買彩券、儲存結果、帳號。

遊戲規則固定如下，來源為台灣彩券（Taiwan Lottery）現行玩法，本文即為契約，不留給登入者或使用者查證：

| 遊戲 ID | 顯示名 | 第一區 | 第二區 |
| --- | --- | --- | --- |
| `lotto649` | 大樂透 / Lotto 6/49 | 1–49 選 6 | 無 |
| `power638` | 威力彩 / Super Lotto 638 | 1–38 選 6 | 1–8 選 1 |
| `daily539` | 今彩539 / Daily Cash 539 | 1–39 選 5 | 無 |

已與本 repo `docs/specs/` 既有 101 份規格比對，最相近者的實質差異如下。

- 從使用者給的清單中隨機抽出一項。此處依固定遊戲規則從完整號碼範圍抽出整組號碼，且以固定種子逐位重現。 decision-wheel-picker
- 計算多顆骰子點數和的機率分布。此處不算機率分布，只產生符合遊戲規則的號碼組，同種子必同結果。 dice-sum-distribution
- 以密碼學亂數產生密碼。此處刻意不用密碼學亂數：可重現性是產品本身，亂數品質主張只到「每種組合機會相等」的演算法層級。 password-generator

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「遊戲 / Game」：三選一（大樂透、威力彩、今彩539），切換遊戲不清空種子與組數，排除清單保留但於下次執行依新遊戲範圍重新驗證。
- 欄位或說明「種子 / Seed」：十進位整數 0–4294967295。輔助文字固定：「留空時會自動產生一個種子並顯示出來，之後可用同一種子重現。 / Leave blank to have a seed generated and shown; reuse it to reproduce the same numbers.」
- 欄位或說明「組數 / Sets」：1–10。
- 欄位或說明「排除號碼 / Exclude numbers」：以逗號分隔的第一區號碼清單。輔助文字固定：「只套用到第一區；威力彩第二區不排除。 / Applies to Zone 1 only; the Super Lotto Zone 2 is never excluded.」
- 「產生號碼 / Generate numbers」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（大樂透、種子 42、3 組、無排除），明示範例並等待手動執行。
- 結果先顯示遊戲與種子摘要，再逐組列出號碼；每組有「第 N 組 / Set N」標籤，威力彩另有「第一區 / Zone 1」「第二區 / Zone 2」標籤。號碼以文字呈現，不只靠顏色或球形區分。結果區固定附誠實說明（見 inputsOutputs 第 7 點）。成功才顯示「複製號碼 / Copy numbers」與「下載號碼 / Download numbers」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果、複製和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無複製／下載。編輯終止舊工作並回 dirty。 |
| success | 結果對應目前快照，含固定誠實說明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用代幣序號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"game":"lotto649","seed":"","setCount":"3","exclude":""}` 並聚焦遊戲欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線產生。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位與文法：

- `game`：字串，只接受 `lotto649`、`power638`、`daily539`，其他字串為 ENUM。預設 `lotto649`。
- `seed`：ASCII 十進位整數字串，`0` 或非零開頭，無空白／符號／小數／指數，raw 最多 10 單元。範圍 0–4294967295（uint32）。空字串為 EMPTY。預設 `""`（核心層級為錯誤；app 層級的留空處理見 implementation）。
- `setCount`：同 seed 文法，raw 最多 2 單元，範圍 1–10，空字串為 EMPTY。預設 `"3"`。
- `exclude`：字串，raw 最多 256 單元。空字串表示不排除。以 `,` 切分為代幣；每個代幣先去除前後 U+0020 空格（只修剪空格，其他空白字元不修剪、會使文法失敗）；修剪後為空的代幣為 INTEGER_FORMAT，row 為該代幣的 1-based 序號。只含空格的字串不等於空字串，會產生一個空代幣。代幣文法與 seed 相同；範圍為所選遊戲第一區範圍（lotto649 1–49、power638 1–38、daily539 1–39），越界為 RANGE，row 為代幣序號。重複值為 DUPLICATE，row 為第二次出現的代幣序號。排除只套用第一區；`power638` 的第二區永遠使用完整 1–8。

驗證順序固定：

1. 整體 schema（欄位集合、型別、accessor）→ SCHEMA。
2. `game`：ENUM。
3. `seed`：依序 INPUT_LIMIT、EMPTY、INTEGER_FORMAT、RANGE，field 為 `seed`，row=null。
4. `setCount`：依序 INPUT_LIMIT、EMPTY、INTEGER_FORMAT、RANGE，field 為 `setCount`，row=null。
5. `exclude`：INPUT_LIMIT（field `exclude`，row=null）；再逐代幣由左到右 INTEGER_FORMAT、RANGE（row 為代幣序號）；全部代幣通過後再由左到右查 DUPLICATE（row 為重複代幣序號）。
6. 跨欄：第一區範圍大小減去排除個數小於該遊戲需選個數時 POOL_TOO_SMALL，field 為 `exclude`，row=null。恰好等於需選個數時合法。

整份失敗回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源失敗用固定 INTERNAL，不回傳堆疊。

產生算法固定如下，逐位可重現，不使用 `Math.random` 或密碼學亂數：

1. PRNG 為 mulberry32，state 為 uint32，初始值為 seed。每次呼叫的精確步驟（所有運算為 32 位元；`imul` 取乘積低 32 位元；`>>>` 為邏輯右移；`>>> 0` 為轉 uint32）：
   - `state = (state + 0x6D2B79F5) >>> 0`
   - `t = state`
   - `t = imul(t ^ (t >>> 15), t | 1)`
   - `t = t ^ ((t + imul(t ^ (t >>> 7), t | 61)) mod 2^32)`
   - 回傳 `((t ^ (t >>> 14)) >>> 0) / 4294967296`，為 [0,1) 的倍精度數，形如 k/2^32。
2. 每個 run 只建立一個 PRNG 實例，由 seed 初始化一次；run 內不重設種子，核心在呼叫之間不保留任何狀態（同輸入恆同輸出）。
3. 每一區的號碼池為該區範圍升序整數，扣除排除（僅第一區）。抽 k 個用 partial Fisher–Yates：`a` 為號碼池副本；對 i=0..k−1，取 `r = next()`，`j = i + floor(r × (a.length − i))`，交換 `a[i]` 與 `a[j]`。每個 i 恰好呼叫一次 `next()`，即使 `a.length − i == 1` 也不省略。取 `a[0..k−1]` 後以數值升序排序為該區結果。
4. PRNG 消耗順序固定：組 s=1..setCount，依序抽第一區，`power638` 再抽第二區（k=1，號碼池 1–8，無排除，一樣消耗一次 `next()`）。不為顯示、排序或任何其他目的呼叫 `next()`。
5. 結果 `{game, seed, sets}`：seed 為解析後的數字；sets 長度等於 setCount；每組 `{zone1, zone2}`，zone1 為升序數字陣列（長度依遊戲 6／6／5），zone2 為 `power638` 的單元素陣列，其他遊戲為 `null`。組與組之間不去重：串流若產生相同的一組，照原樣列出。所有數字為安全整數。機器值不隨 locale 改。
6. 顯示：號碼為不補零的十進位整數，組依產生順序標示第 1 組至第 10 組。
7. 誠實說明固定文字，成功結果必附，兩語皆同義：「每種號碼組合出現的機率完全相等；本工具不能預測開獎結果，任何號碼組合的中獎機率都相同。 / Every combination is equally likely. This tool cannot predict draw results; no combination has a better chance of winning than any other.」
8. 複製文字固定格式：每組一行；單區遊戲為第一區號碼以單一 U+0020 連接（如 `12 23 29 30 34 43`）；`power638` 為第一區連接後加 ` + ` 與第二區號碼（如 `10 14 18 22 29 30 + 1`）。行間以 LF 連接，無結尾 LF。固定下載 `lottery-picks.txt`，內容為複製文字的完全相同 bytes、UTF-8 無 BOM。

錯誤訊息固定（zh／en，依 code 與 field 選用）：

| code | zh | en |
| --- | --- | --- |
| SCHEMA | 輸入格式不正確。 | Input is malformed. |
| EMPTY（seed） | 種子不可空白。 | Seed must not be blank. |
| EMPTY（setCount） | 組數不可空白。 | Sets must not be blank. |
| INPUT_LIMIT | 輸入太長。 | Input is too long. |
| INTEGER_FORMAT | 請輸入不含空白、符號或小數的十進位整數。 | Enter a decimal integer with no spaces, sign, decimals or exponent. |
| RANGE（seed） | 種子必須介於 0 到 4294967295。 | Seed must be between 0 and 4294967295. |
| RANGE（setCount） | 組數必須介於 1 到 10。 | Sets must be between 1 and 10. |
| RANGE（exclude） | 排除號碼必須在該遊戲第一區的號碼範圍內。 | Excluded numbers must be within the game's Zone 1 range. |
| ENUM | 請選擇一種遊戲。 | Choose a game. |
| DUPLICATE | 排除號碼重複。 | Excluded numbers must not repeat. |
| POOL_TOO_SMALL | 排除後剩下的號碼不足以選出一組。 | Too many numbers excluded — not enough remain to form a set. |
| INTERNAL | 處理失敗，請重試。 | Something went wrong. Try again. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/lottery-number-picker/`。`public/js/core/*.mjs` 放純驗證、mulberry32 與抽樣算法；`public/js/app.js` 用安全 DOM API 綁表單與狀態；`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。測試 import 同一份核心。

- 計算量極小（最壞 10 組 × 7 次抽樣），不使用 Worker。工作以 `setTimeout(0)` 排程到下一個 macrotask 才執行核心，使取消與編輯可介入；controller 持有世代號，工作開始先使舊結果失效並遞增世代。只接受目前世代且 busy 的完成；取消清除待執行計時器；編輯、換來源、重設或 pagehide 皆終止待執行工作並丟棄晚到完成。不假造進度條，busy 只顯示「處理中」文字與「取消」。
- 種子留空的 app 行為固定：按下「產生號碼」且種子欄為恰好空字串時，先以 `crypto.getRandomValues(new Uint32Array(1))[0]` 產生一個 uint32，把它的十進位字串寫回種子欄並納入本次快照（此寫入是執行的一部分，不單獨觸發 dirty），再呼叫核心。若 `crypto.getRandomValues` 不可用，空字串照原樣送入核心並呈現 EMPTY 錯誤。核心永遠不自行補種子。
- 表格與結果用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿（使用者明確點「複製號碼」除外）、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「產生號碼」，三種遊戲的畫面、複製文字與下載 bytes 符合核心 fixtures（含串流跨組、跨區與排除案例），使用者取得對應產物。 |
| boundaries | 種子 0 與 4294967295、種子剛好越界、組數 1 與 10／11、排除後池恰好等於需選個數、池不足、第一個錯誤與代幣 row 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；自動產生的種子只寫回頁面欄位。 |
| security | 敵意輸入 inert、無動態執行、核心不用 Math.random／crypto 產生號碼、CSP、固定下載名稱與內容、資源上限。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改、複製和下載可操作；留空種子的自動補種子行為可理解且可重現。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion；號碼不只靠顏色區分。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含誠實說明與 FAQ）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、排程取消、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，複製文字與下載用 bytes 比對。不得用產品程式產生 expected；fixtures 的號碼預期由作者以兩份獨立 scratch 實作（JS Math.imul 版與 Python 32 位元遮罩版）交叉推導，見 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。

| 案例 ID | 驗證行為 |
| --- | --- |
| `lotto649-basic` | 大樂透 3 組，PRNG 串流跨組連續 |
| `power-basic` | 威力彩跨區、跨組的串流順序（第一區後第二區） |
| `daily539-basic` | 今彩539 5/39 基本案例 |
| `lotto649-exclude` | 排除先縮小號碼池再抽樣 |
| `power-exclude` | 排除只套第一區、代幣空格修剪、第二區不受排除 |
| `seed-zero` | 種子下限 0 |
| `seed-max-ten-sets` | 種子上限與組數上限的長串流 |
| `daily539-exact-pool` | 池恰好等於需選個數，仍消耗 k 次 PRNG 呼叫 |
| `exclude-overflow` | 池不足 POOL_TOO_SMALL |
| `seed-range` | 種子剛好越界 RANGE |
| `exclude-duplicate` | 重複排除 DUPLICATE 與 row |
| `sets-range` | 組數 11 RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及複製／下載立即失效。 |
| `state-cancel-late` | 排程完成前取消，晚到結果不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制觸發時機的假排程器。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在排程觸發前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面、複製與下載。

另測：種子前導零 `042` 與 `+42` 皆 INTEGER_FORMAT；seed 非字串、缺欄、額外欄、accessor 皆 SCHEMA；exclude 只含空格產生空代幣錯誤；exclude 代幣夾 tab 不修剪而文法失敗；惡意字串 inert；快速改值及晚到完成；同輸入兩次 run 結果逐位相同（決定性）；結果每區無重複且在範圍內、升序；組數恰好等於 setCount。

候選 gate（均 NOT_RUN）

- 於 `tools/lottery-number-picker/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/複製與下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、複製並核對剪貼簿文字、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線產生。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「樂透選號器」，title「樂透選號器｜Gloss Tools」，description「用固定種子重現的亂數，幫大樂透、威力彩、今彩539 產生選號；同一個種子永遠產生同一組號碼，每種組合出現的機會都相等。」。英文 lang=en，H1 “Lottery Number Picker”，title “Lottery Number Picker | Gloss Tools”，description “Generate picks for Taiwan's Lotto 6/49, Super Lotto 638 and Daily Cash 539 with a seeded, reproducible generator — the same seed always yields the same numbers, and every combination is equally likely.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。同一個種子為什麼每次號碼都一樣？產生器由種子完全決定，同種子必然同結果，方便重現與核對。 / Why does the same seed always give the same numbers? The generator is fully determined by the seed, so results are reproducible and can be checked again later.
- FAQ。產生的號碼比較容易中獎嗎？不會。每種組合機率完全相等，本工具不能預測開獎結果。 / Are generated numbers more likely to win? No. Every combination is equally likely, and this tool cannot predict draw results.
- FAQ。排除號碼會改變其他號碼的中獎率嗎？不會，只是不讓被排除的號碼出現在結果中；其餘每種組合仍完全相等。 / Does excluding numbers change the odds of the rest? No — excluded numbers simply never appear; every remaining combination stays equally likely.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow；預覽以相對 canonical 與互惠 hreflang（zh-Hant／en，x-default 指向 zh-Hant）互連，首頁回鏈為同語相對路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://lottery-number-picker.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。規格 task id 為 `labs-lottery-number-picker-spec-20261109`（由主代理登記，作者未自行註冊）。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/lottery-number-picker/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
