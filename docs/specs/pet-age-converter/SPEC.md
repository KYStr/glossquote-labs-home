# 寵物年齡換算 / Pet Age Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-pet-age-converter-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/5c059036c7eebfbf6edceca8aaf22cc95813f31d/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

飼主想知道自家狗或貓「相當於人類幾歲、現在是哪個生命階段」，用固定的分段模型把寵物年齡換算成人類等效年齡。

- 桌面。飼主在電腦上查健檢報告，對照狗狗的歲數與體型慢慢核對三段明細。
- 行動。飼主在獸醫院候診或寵物店聊天時，用手機輸入歲＋月，立刻看到等效年齡與階段。

使用情境為日常參考換算。資料只保留在目前頁面草稿。本工具是經驗模型的算術換算，不是獸醫診斷或健康建議。

## scope

固定範圍：物種狗／貓；狗的體型四級（小型／中型／大型／巨型）只影響第三年起的年增量；年齡以總月數 0 起算，上限狗 360 個月（30 歲）、貓 456 個月（38 歲）；月份在目前所在段內按比例線性折算；生命階段由精確（未捨入）的人類等效年齡查表決定。非目標為依出生日期推算年齡、依體重或品種自動判定體型、預期壽命、健康／醫療／飲食建議、狗貓以外物種（兔、鳥、爬蟲等）、多隻寵物並排比較、歷史紀錄、帳號、分享連結或任何匯出檔案。

已與本 repo `docs/specs/` 全部既有預案比對，無同主題者。最相近者的實質差異如下。

- 人類孕期到期日與孕齡計算（`pregnancy-due-date-calculator`）。此處對象是狗與貓，模型是分段等效年齡而非日期推算。
- 人類 BMI 與熱量需求（`bmi-tdee-calculator`）。此處不涉及體重、身高或熱量，只做年齡換算與階段標籤。

判定規則由本文定義，是廣泛流傳的分段近似模型（第一年約人類 15 歲、第二年再加約 9 歲、其後依體型逐年增加）在本規格的固定版本；無線上資料或外部服務依賴，實作不得另查其他換算表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「物種、體型 / Species and size」。物種為狗／貓二選一；體型四選一，僅狗需要。選貓時體型欄停用並清空，畫面標示「貓不需要選體型 / Cats do not need a size」。
- 欄位或說明「年齡：歲與月 / Age: years and months」。歲與月兩個整數欄；月可留 0。
- 體型欄下方以固定說明文字列出各體型的常見品種例（顯示文案，不參與計算）：小型「貴賓犬、吉娃娃 / Poodle, Chihuahua」、中型「米格魯、邊境牧羊犬 / Beagle, Border Collie」、大型「黃金獵犬、德國牧羊犬 / Golden Retriever, German Shepherd」、巨型「大丹犬、聖伯納犬 / Great Dane, Saint Bernard」。
- 「換算年齡 / Convert age」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（中型犬 3 歲 6 個月），明示範例並等待手動執行。
- 「人類等效年齡與生命階段 / Human-equivalent age and life stage」先摘要（等效年齡大字＋階段標籤）再列三段明細（第一年／第二年／之後）。結果區固定揭露經驗法則提醒（見 tests 節固定文案）。本工具無下載、複製或分享產物；結果文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入或選項改變，立即撤銷舊結果。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。編輯終止舊工作並回 dirty。 |
| success | 結果對應目前快照：等效年齡、階段標籤與三段明細。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"species":"dog","size":"medium","years":"","months":""}` 並聚焦物種欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算；計算為同步純函數，經一次可取消的延後排程執行（見 implementation），不假造進度條，執行器失敗保留草稿供重試。

## inputsOutputs

核心 `convert(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field 為出問題的欄位名（整體非物件時 field=null），row 一律 null。本工具無列式輸入。JSON fixture 即介面。表單值以 DOM 的字串為準。

輸入欄位（皆為字串）：

| 欄位 | 值域 | 預設 |
| --- | --- | --- |
| `species` | `"dog"` 或 `"cat"` | `"dog"` |
| `size` | `"small"`／`"medium"`／`"large"`／`"giant"`；狗必填，貓必須為 `""` | `"medium"` |
| `years` | ASCII 十進整數字串（見文法），欄位上限 38 | `""` |
| `months` | ASCII 十進整數字串，0–11 | `""` |

驗證順序固定如下，整份只回第一個錯誤 `{ok:false,error:{code,field,row}}`：

1. 整體形狀。input 須為普通物件且四欄皆為 own data 字串性質；未知欄、缺欄、非字串值或 accessor → SCHEMA（field 為該欄名，非物件或未知欄時 field=null）。
2. 逐欄容量與字元。依 species、size、years、months 順序，每欄 raw 長度超過 8 個 UTF-16 code units → INPUT_LIMIT；含不成對 surrogate → UNICODE。field 即該欄名。
3. 逐欄語義，依 species → size → years → months 順序：
   - `species`：空字串 → EMPTY；非 `"dog"`／`"cat"` → ENUM。
   - `size`：species 為 dog 時，空字串 → EMPTY，非四值之一 → ENUM；species 為 cat 時，必須為 `""`，任何非空值 → ENUM。
   - `years`：空字串 → EMPTY；文法不符 → INTEGER_FORMAT；數值 > 38 → RANGE。
   - `months`：空字串 → EMPTY；文法不符 → INTEGER_FORMAT；數值 > 11 → RANGE。
   整數文法：全為 ASCII 數字，`"0"` 或非零開頭，無空白／正負號／小數點／指數。
4. 跨欄總月數。totalMonths = 12 × years + months。上限：dog 360、cat 456；超過 → RANGE，field=`"years"`（歲是主要量級欄）。等於上限合法。

資源或執行器失敗用固定 INTERNAL，不回傳堆疊。成功僅為 `{ok:true,result}`。

換算模型（以總月數 m 定義，段界以月計，折算在段內線性）：

- 第一段 m ∈ [0, 12]：速率為每年 15 人類歲，即每月 15/12。貢獻 seg1 = 15 × min(m, 12) / 12。
- 第二段 m ∈ (12, 24]：速率為每年 9 人類歲。貢獻 seg2 = 9 × clamp(m − 12, 0, 12) / 12。
- 第三段 m > 24：速率 r（人類歲／年）依物種與體型：貓 4；狗小型 4、中型 5、大型 6、巨型 7。貢獻 seg3 = r × max(m − 24, 0) / 12。

精確人類等效年齡 H = seg1 + seg2 + seg3（有理數，不先捨入）。顯示值 humanYears 為 H 四捨五入（round half-up）至小數一位。seg1／seg2／seg3 的顯示值各自獨立以同規則捨入至小數一位；三段顯示值之和可能與 humanYears 顯示值差 0.1，屬預期，畫面不做校正（tests 節 FAQ 揭露）。

生命階段以精確 H 查表（下限含、上限不含）：

| stageKey | 條件（精確 H） | stageZh | stageEn |
| --- | --- | --- | --- |
| `puppy`（狗）／`kitten`（貓） | H < 15 | 狗「幼犬」／貓「幼貓」 | Puppy／Kitten |
| `young` | 15 ≤ H < 24 | 青年 | Young adult |
| `adult` | 24 ≤ H < T1 | 成年 | Adult |
| `mature` | T1 ≤ H < T2 | 熟齡 | Mature |
| `senior` | H ≥ T2 | 高齡 | Senior |

T1／T2 依物種與體型：狗小型 65／85、中型 55／75、大型 45／65、巨型 38／55；貓 55／75。

結果 `{species,size,totalMonths,humanYears,stageKey,stageZh,stageEn,breakdown,laterRatePerYear}`：size 貓為 null；breakdown 為 `{segment1,segment2,segment3}`（各為 1 位小數顯示值）；laterRatePerYear 為該物種／體型的 r（4／5／6／7），不因目前所在段改變。結果無排序需求：明細固定 segment1 → segment2 → segment3 呈現。機器值不隨 locale 改；年齡顯示一律 1 位小數（含整數值，如 `31.0`）。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/pet-age-converter/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精確算術。核心以「十二分之一人類歲」為整數單位運算：N12 = 15 × min(m,12) + 9 × clamp(m−12,0,12) + r × max(m−24,0)，即 H = N12 / 12，全程整數、無浮點。1 位小數捨入以整數完成：t = floor((10 × N12 + 6) / 12)，顯示值 = t / 10（round half-up 的整數等價式）；三段各自以其 N12 分量同式計算。階段判定直接比較 N12 與 12 × 門檻（如 H ≥ 75 ⇔ N12 ≥ 900），不經顯示值。
- 工作開始先使舊結果失效並遞增世代號。核心為同步純函數；controller 以一次延後排程（setTimeout 0 或等價可注入排程器）執行快照，使 busy／取消為真實狀態而非假進度。取消、換輸入、重設或 pagehide 時清除待執行工作並丟棄結果。只收目前世代且 busy 的結果。狀態測例使用可控制完成時間的假排程器。bfcache 回來重設。
- 選貓時 app 把 size 草稿清為 `""` 並停用體型欄；核心仍依契約把「貓＋非空 size」判為 ENUM，兩層行為並存且各自可測。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算年齡」，畫面結果符合核心 fixtures：等效年齡、階段與三段明細正確。 |
| boundaries | 合法端點（0 個月、段界 12／24 個月、階段門檻恰達、物種上限 360／456）、剛好越界、第一個錯誤與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限和待執行工作／世代 dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改可操作；選貓時體型欄停用的行為正確。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、取消和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `dog-medium-mid-segment` | 中型犬第三段中段折算與成年階段 |
| `dog-small-second-segment-proration` | 小型犬第二段按月折算與 20.25 → 20.3 捨入 |
| `cat-first-segment-proration` | 貓第一段按月折算與幼貓階段 |
| `cat-senior-threshold` | 貓精確 H 恰為 75，高齡門檻（含下限） |
| `dog-giant-senior` | 巨型犬年增量 7 與高齡階段 |
| `dog-large-mature-threshold` | 大型犬精確 H 恰為 45，熟齡門檻（含下限） |
| `dog-zero-months` | 0 個月端點，H=0 與幼犬階段 |
| `dog-max-boundary` | 狗總月數上限 360 恰達，合法 |
| `dog-size-missing` | 狗未選體型，EMPTY／size |
| `cat-size-filled` | 貓帶體型值，ENUM／size |
| `months-decimal-format` | 月含小數點，INTEGER_FORMAT／months |
| `dog-over-max` | 狗 30 歲 1 個月總月數越界，RANGE／years |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 延後完成前取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假排程器。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在完成前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可用性（本工具無下載產物，檢查 resultAvailable）。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 m=12（第一段恰滿，H=15 → 青年）、m=13（第二段首月）、m=24（第二段恰滿，H=24 → 成年）、m=25（第三段首月）、貓總月數 456 恰達與 457 越界、years 文法（前導零、空白、正負號）、階段門檻前後 1 個月（N12 差 1 單位）。

候選 gate（均 NOT_RUN）

- 於 `tools/pet-age-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「寵物年齡換算」，title「寵物年齡換算｜Gloss Tools」，description「把狗狗或貓咪的年齡換算成人類等效年齡：第一年 15 歲、第二年再加 9 歲，之後依物種與體型逐年增加，並標示生命階段。」。英文 lang=en，H1 “Pet Age Converter”，title “Pet Age Converter | Gloss Tools”，description “Convert a dog's or cat's age to human-equivalent years with a pinned piecewise model: 15 for the first year, +9 for the second, then a per-year increment by species and size, plus a life-stage label.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 經驗法則提醒（結果區與說明區固定文案）。中文：「經驗法則提醒：坊間「乘以 7」的算法不符合本分段模型——光是第一年就相當於人類 15 歲。請以分段計算結果為準，本結果僅供日常參考，不是獸醫建議。」英文：“Rule-of-thumb note: the popular 'multiply by 7' shortcut does not match this piecewise model — the first year alone equals 15 human years. Treat the result as an everyday reference, not veterinary advice.”
- FAQ。月份怎麼算？未滿一年的部分，在目前所在的段內按比例線性折算，例如中型犬 3 歲 6 個月，第三段只算半年。 / How are months counted? A partial year is prorated linearly inside its current segment — a 3-year-6-month medium dog accrues only half of the third segment's year.
- FAQ。為什麼三段加起來可能差 0.1？三段各自獨立四捨五入到小數一位，合計可能與總年齡的顯示值差 0.1；階段判定用未捨入的精確值，不受影響。 / Why can the three segments differ from the total by 0.1? Each segment is rounded to one decimal independently, so their sum can differ from the displayed total by 0.1; the life stage uses the exact unrounded value.
- FAQ。這是醫療建議嗎？不是。這是經驗模型的參考換算；健康、飲食與運動請諮詢獸醫。 / Is this medical advice? No. It is a reference conversion from a rule-of-thumb model; ask a veterinarian about health, diet and exercise.
- 錯誤訊息固定對照（field 以欄位本地化名稱代入）。EMPTY：中文「{欄位}不可空白。」英文 “{Field} must not be empty.”。INTEGER_FORMAT：中文「{欄位}必須是整數。」英文 “{Field} must be a whole number.”。RANGE：中文「{欄位}超出允許範圍。」英文 “{Field} is out of range.”。ENUM：中文「{欄位}不是可用的選項。」英文 “{Field} is not an available option.”。INPUT_LIMIT：中文「輸入太長。」英文 “Input is too long.”。UNICODE：中文「輸入包含無效字元。」英文 “Input contains invalid characters.”。SCHEMA：中文「輸入格式不正確。」英文 “Input is malformed.”。INTERNAL：中文「發生未預期的錯誤，請重試。」英文 “Something went wrong. Please try again.”。欄位名稱：species「物種／Species」、size「體型／Size」、years「歲／Years」、months「月／Months」。
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://pet-age-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格 task id `labs-pet-age-converter-spec-20261109`（由主代理登記）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/pet-age-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
